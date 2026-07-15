import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import {
  useAcceptRuntimeDiscoveryMutation,
  useAcceptRuntimeSectionMutation,
  useApproveRuntimeOutcomeDraftMutation,
  useClearRuntimeSectionEvidenceMutation,
  useCreateRuntimeOutcomeSessionMutation,
  useCreateRuntimeOutputRequestMutation,
  useCreateRuntimeRevisionMutation,
  useExecuteRuntimeActionMutation,
  useGenerateRuntimeOutputRequestMutation,
  useGetRuntimeEvidenceQuery,
  useGetRuntimeIntelligenceGraphQuery,
  useGetRuntimeOutputLabQuery,
  useGetRuntimeOutcomeStudioQuery,
  useGetRuntimeOutcomeStudioReadinessQuery,
  useGetRuntimeOutcomeSessionQuery,
  useLazyGetRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeAssetPreviewQuery,
  useGetRuntimeRendererQuery,
  useGetRuntimeTruthQualityQuery,
  useGenerateRuntimeOutcomeResponseMutation,
  useLazyExportRuntimeOutcomeAssetQuery,
  useLazyExportRuntimeOutputAssetQuery,
  useMutateRuntimeStateMutation,
  usePublishRuntimeOutcomeAssetMutation,
  useResetRuntimeDiscoveryMutation,
  useReviewRuntimeDiscoveryEvidenceMutation,
  useReviewAllRuntimeSectionEvidenceMutation,
  useReviewRuntimeSectionEvidenceMutation,
  useSubmitRuntimeOutcomeMessageMutation,
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation,
  useUpdateRuntimeSectionEvidenceMutation,
  useUpdateRuntimeDiscoveryInputsMutation,
} from '../../store/api/runtimeInstanceApi.js'
import RuntimeWorkspace from './RuntimeWorkspace'

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useAcceptRuntimeDiscoveryMutation: vi.fn(),
  useAcceptRuntimeSectionMutation: vi.fn(),
  useApproveRuntimeOutcomeDraftMutation: vi.fn(),
  useClearRuntimeSectionEvidenceMutation: vi.fn(),
  useCreateRuntimeOutcomeSessionMutation: vi.fn(),
  useCreateRuntimeOutputRequestMutation: vi.fn(),
  useCreateRuntimeRevisionMutation: vi.fn(),
  useExecuteRuntimeActionMutation: vi.fn(),
  useGenerateRuntimeOutputRequestMutation: vi.fn(),
  useGetRuntimeEvidenceQuery: vi.fn(),
  useGetRuntimeIntelligenceGraphQuery: vi.fn(),
  useGetRuntimeOutputLabQuery: vi.fn(),
  useGetRuntimeOutcomeStudioQuery: vi.fn(),
  useGetRuntimeOutcomeStudioReadinessQuery: vi.fn(),
  useGetRuntimeOutcomeSessionQuery: vi.fn(),
  useLazyGetRuntimeOutcomeAssetQuery: vi.fn(),
  useLazyGetRuntimeOutcomeAssetPreviewQuery: vi.fn(),
  useGetRuntimeRendererQuery: vi.fn(),
  useGetRuntimeTruthQualityQuery: vi.fn(),
  useGenerateRuntimeOutcomeResponseMutation: vi.fn(),
  useLazyExportRuntimeOutcomeAssetQuery: vi.fn(),
  useLazyExportRuntimeOutputAssetQuery: vi.fn(),
  useMutateRuntimeStateMutation: vi.fn(),
  usePublishRuntimeOutcomeAssetMutation: vi.fn(),
  useResetRuntimeDiscoveryMutation: vi.fn(),
  useReviewRuntimeDiscoveryEvidenceMutation: vi.fn(),
  useReviewAllRuntimeSectionEvidenceMutation: vi.fn(),
  useReviewRuntimeSectionEvidenceMutation: vi.fn(),
  useSubmitRuntimeOutcomeMessageMutation: vi.fn(),
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation: vi.fn(),
  useUpdateRuntimeSectionEvidenceMutation: vi.fn(),
  useUpdateRuntimeDiscoveryInputsMutation: vi.fn(),
}))

vi.mock('../../components/RuntimeGraphPanel', async () => {
  const React = await import('react')

  const formatTokenLabel = (value) =>
    String(value || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())

  const getSafeNodeLabel = (node = {}) => {
    const nodeType = String(node.nodeType || '').trim().toUpperCase()
    const typeLabel = node.entityDisplayName || formatTokenLabel(node.nodeType) || 'Graph Node'
    if (nodeType === 'SOURCE' || nodeType === 'EVIDENCE') return typeLabel
    return node.label || typeLabel
  }

  const MockRuntimeGraphPanel = ({ className = '', error = null, graph = null, loading = false }) => {
    const visibleNodes = Array.isArray(graph?.nodes)
      ? graph.nodes.filter((node) => node?.customerVisible !== false && node?.nodeId)
      : []
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.nodeId))
    const visibleEdges = Array.isArray(graph?.edges)
      ? graph.edges.filter((edge) =>
        edge?.customerVisible !== false
        && visibleNodeIds.has(edge?.fromNodeId)
        && visibleNodeIds.has(edge?.toNodeId))
      : []

    return React.createElement(
      'section',
      {
        className,
        role: 'region',
        'aria-label': 'Runtime intelligence graph',
      },
      [
        React.createElement('h3', { key: 'title' }, 'Runtime Intelligence Graph'),
        loading
          ? React.createElement('p', { key: 'loading' }, 'Loading graph projection...')
          : null,
        error
          ? React.createElement('p', { key: 'error' }, 'Graph projection is unavailable right now.')
          : null,
        graph?.available
          ? React.createElement(
            'p',
            { key: 'summary' },
            `${visibleNodes.length} graph nodes / ${visibleEdges.length} graph relationships`,
          )
          : React.createElement(
            'p',
            { key: 'empty' },
            'Rebuild the Intelligence Graph to project runtime nodes and relationships.',
          ),
        React.createElement(
          'ul',
          { key: 'nodes', 'aria-label': 'Runtime intelligence graph test nodes' },
          visibleNodes.map((node) => React.createElement(
            'li',
            { key: node.nodeId },
            getSafeNodeLabel(node),
          )),
        ),
        React.createElement(
          'ul',
          { key: 'edges', 'aria-label': 'Runtime intelligence graph test relationships' },
          visibleEdges.map((edge) => React.createElement(
            'li',
            { key: edge.edgeId },
            edge.relationshipDisplayName || formatTokenLabel(edge.edgeType),
          )),
        ),
      ],
    )
  }

  return {
    default: MockRuntimeGraphPanel,
    RuntimeGraphPanel: MockRuntimeGraphPanel,
  }
})

const refetchRenderer = vi.fn()
const refetchOutputLab = vi.fn()
const refetchOutcomeStudio = vi.fn()
const refetchOutcomeStudioSession = vi.fn()
const mutateRuntimeState = vi.fn()
const unwrapMutation = vi.fn()
const executeRuntimeAction = vi.fn()
const unwrapAction = vi.fn()
const createRuntimeOutcomeSession = vi.fn()
const unwrapCreateRuntimeOutcomeSession = vi.fn()
const submitRuntimeOutcomeMessage = vi.fn()
const unwrapSubmitRuntimeOutcomeMessage = vi.fn()
const generateRuntimeOutcomeResponse = vi.fn()
const unwrapGenerateRuntimeOutcomeResponse = vi.fn()
const updateRuntimeOutcomeSessionFromLatestTruth = vi.fn()
const unwrapUpdateRuntimeOutcomeSessionFromLatestTruth = vi.fn()
const getRuntimeOutcomeAssetDetail = vi.fn()
const getRuntimeOutcomeAssetPreview = vi.fn()
const createRuntimeOutputRequest = vi.fn()
const unwrapCreateRuntimeOutputRequest = vi.fn()
const createRuntimeRevision = vi.fn()
const unwrapCreateRuntimeRevision = vi.fn()
const generateRuntimeOutputRequest = vi.fn()
const unwrapGenerateRuntimeOutputRequest = vi.fn()
const exportRuntimeOutputAsset = vi.fn()
const unwrapExportRuntimeOutputAsset = vi.fn()
const exportRuntimeOutcomeAsset = vi.fn()
const unwrapExportRuntimeOutcomeAsset = vi.fn()
const publishRuntimeOutcomeAsset = vi.fn()
const unwrapPublishRuntimeOutcomeAsset = vi.fn()
const approveRuntimeOutcomeDraft = vi.fn()
const unwrapApproveRuntimeOutcomeDraft = vi.fn()
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
const reviewAllRuntimeSectionEvidence = vi.fn()
const unwrapReviewAllRuntimeSectionEvidence = vi.fn()
const updateRuntimeSectionEvidence = vi.fn()
const unwrapUpdateRuntimeSectionEvidence = vi.fn()
const clearRuntimeSectionEvidence = vi.fn()
const unwrapClearRuntimeSectionEvidence = vi.fn()
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

const outputLabPayload = {
  contractVersion: 'output-lab.v1',
  definitions: [
    {
      outputTypeKey: 'EXECUTIVE_BRIEF',
      label: 'Executive Brief',
      description: 'A concise executive outcome summary built from locked VMF truth.',
      supportedFormats: ['MARKDOWN', 'JSON'],
    },
  ],
  readiness: {
    state: 'BLOCKED',
    canGenerate: false,
    summary: 'Locked canonical runtime truth is required before Output Lab generation.',
    blockers: [
      {
        code: 'RUNTIME_NOT_LOCKED',
        message: 'Locked canonical runtime truth is required before Output Lab generation.',
      },
    ],
    warnings: [],
    acceptedTruthCount: 0,
    requiredTruthCount: 1,
    outputEligibility: {
      outputEligible: false,
      lockSnapshotId: '',
      replayAnchorId: '',
    },
    graph: {
      available: false,
    },
  },
  requests: [],
  assets: [],
}

const readyOutputLabPayload = {
  ...outputLabPayload,
  readiness: {
    state: 'READY',
    canGenerate: true,
    summary: 'Output Lab can generate governed output from locked canonical runtime truth.',
    blockers: [],
    warnings: [],
    acceptedTruthCount: 4,
    requiredTruthCount: 4,
    outputEligibility: {
      outputEligible: true,
      lockSnapshotId: 'runtime-truth-lock-output-lab-fixture',
      replayAnchorId: 'runtime-replay-anchor-output-lab',
    },
    graph: {
      available: true,
      graphVersion: '2.2',
      graphHash: 'sha256:graph-hash',
    },
  },
}

const truthQualityPayload = {
  contractVersion: 'truth-quality.v1',
  runtimeInstanceId: 'runtime-1',
  runtimeInstanceKey: 'value-narrative-001',
  certification: {
    level: 'STRATEGIC_TRUTH',
    levelNumber: 4,
    label: 'Strategic Truth',
    summary: 'High coverage, high confidence, diverse source support, and low contradiction risk.',
  },
  quality: {
    coverage: {
      score: 90,
      band: 'VERY_HIGH',
      source: 'DIG_COVERAGE',
      missingDomains: [],
    },
    confidence: {
      score: 92,
      band: 'HIGH',
      acceptedEvidenceCount: 8,
      acceptedTruthCount: 4,
      supportingSourceCount: 5,
      warnings: [],
    },
    sourceDiversity: {
      score: 85,
      band: 'HIGH',
      sourceRecordCount: 5,
      sourceTypeCount: 5,
      sourceTypes: ['ANALYST_REPORT', 'CUSTOMER_PROOF', 'MARKET_REPORT', 'SALES_DECK', 'WEBSITE'],
      rawSourceLabel: 'Raw source label must not render.',
    },
    contradictionRisk: {
      level: 'LOW',
      count: 0,
      unresolvedCount: 0,
      blocking: false,
      source: 'DIG_CONTRADICTIONS',
    },
    qualityBand: 'HIGH',
    knownGaps: [],
    rawEvidenceSnippet: 'Accepted evidence support must not render.',
  },
  graph: {
    graphVersion: '2.2',
    graphHash: 'sha256:truth-quality-graph',
    evaluatedAt: '2026-06-12T15:00:00.000Z',
    rawGraphSnippet: 'Raw graph snippet must not render.',
  },
}

const outcomeStudioPayload = {
  contractVersion: 'outcome-studio.v1',
  phase: 'FOUNDATION_READINESS_ONLY',
  readiness: {
    state: 'BLOCKED',
    canStartSession: false,
    canReason: false,
    summary: 'Outcome Studio requires active Outcome Studio knowledge pack bindings before sessions can start.',
    blockers: [
      {
        code: 'ARL_PACK_MISSING',
        source: 'KNOWLEDGE_PACK_REGISTRY',
        message: 'Adaptive Reasoning Layer must be active before Outcome Studio sessions can start.',
      },
      {
        code: 'RL_PACK_MISSING',
        source: 'KNOWLEDGE_PACK_REGISTRY',
        message: 'Rendering Layer must be active before Outcome Studio sessions can start.',
      },
      {
        code: 'OUTPUT_SCHEMA_PACK_MISSING',
        source: 'KNOWLEDGE_PACK_REGISTRY',
        message: 'Output Schemas must be active before Outcome Studio sessions can start.',
      },
      {
        code: 'TRUTH_CERTIFICATION_PACK_MISSING',
        source: 'KNOWLEDGE_PACK_REGISTRY',
        message: 'Truth Certification must be active before Outcome Studio sessions can start.',
      },
    ],
    warnings: [],
    outputLab: {
      state: 'READY',
      canGenerate: true,
      summary: 'Output Lab can generate governed output from locked canonical runtime truth.',
    },
    knowledgePacks: {
      status: 'BLOCKED',
      mode: 'REGISTRY_RESOLUTION',
      activeCount: 0,
      requiredCount: 5,
      sourceOnlyCount: 2,
    },
    safetyGates: {
      status: 'BLOCKED',
      mode: 'PRE_GENERATION_READINESS',
      responseGenerationAvailable: false,
      passedCount: 2,
      blockedCount: 3,
      totalCount: 5,
    },
  },
  truthBinding: {
    status: 'PROJECTED',
    mode: 'CERTIFIED_RUNTIME_TRUTH',
    runtimeInstanceId: 'runtime-1',
    runtimeInstanceKey: 'value-narrative-001',
    certification: {
      level: 'STRATEGIC_TRUTH',
      levelNumber: 4,
      label: 'Strategic Truth',
      summary: 'High coverage, high confidence, diverse source support, and low contradiction risk.',
    },
    qualityBand: 'HIGH',
    graph: {
      graphVersion: '2.2',
      graphHash: 'sha256:truth-quality-graph',
      evaluatedAt: '2026-06-05T10:12:00.000Z',
    },
    truthSignature: {
      status: 'PROJECTED',
      mode: 'PROJECTED_FROM_RUNTIME_EVIDENCE',
      persistence: 'NOT_PERSISTED',
      currentness: 'CURRENT',
      evidence: {
        runtimeInstanceId: 'runtime-1',
        runtimeInstanceKey: 'value-narrative-001',
        certificationLevel: 'STRATEGIC_TRUTH',
        certificationLabel: 'Strategic Truth',
        qualityBand: 'HIGH',
        sourceOutputAssetId: 'out_asset_test',
        sourceOutputTypeKey: 'EXECUTIVE_BRIEF',
        publishSnapshotId: 'runtime-truth-publish-output-lab-fixture',
        publishSnapshotHash: 'publish-output-lab-hash',
        lockSnapshotId: 'runtime-truth-lock-output-lab-fixture',
        lockSnapshotHash: 'lock-output-lab-hash',
        replayAnchorId: 'runtime-replay-anchor-output-lab',
        replayAnchorHash: 'replay-anchor-output-lab-hash',
        graphVersion: '2.2',
        graphHash: 'sha256:truth-quality-graph',
        evaluatedAt: '2026-06-05T10:12:00.000Z',
      },
      missingEvidence: [],
    },
    sourceOutput: {
      outputAssetId: 'out_asset_test',
      outputTypeKey: 'EXECUTIVE_BRIEF',
      outputTypeLabel: 'Executive Brief',
      status: 'GENERATED',
      stale: false,
      exportable: true,
      supportedFormats: ['MARKDOWN', 'JSON'],
      markdown: 'Raw generated output must not render.',
      safeJson: {
        prompt: 'Raw prompt payload must not render.',
      },
      sourceSnapshot: {
        lockSnapshotId: 'runtime-truth-lock-output-lab-fixture',
        replayAnchorId: 'runtime-replay-anchor-output-lab',
        graphHash: 'sha256:graph-hash',
      },
    },
  },
  safetyGates: {
    status: 'BLOCKED',
    mode: 'PRE_GENERATION_READINESS',
    responseGenerationAvailable: false,
    passedCount: 2,
    blockedCount: 3,
    totalCount: 5,
    summary: 'Outcome Studio can preserve governed prompts when session readiness passes, but response generation remains blocked until all pre-generation gates pass.',
    gates: [
      {
        code: 'SOURCE_OUTPUT_BOUND',
        label: 'Source Output Binding',
        status: 'PASSED',
        message: 'A governed Output Lab source asset is bound for the session.',
      },
      {
        code: 'TRUTH_SIGNATURE_BOUND',
        label: 'Truth Signature Binding',
        status: 'PASSED',
        message: 'Certified Runtime Truth can be bound to the session.',
      },
      {
        code: 'KNOWLEDGE_PACKS_BOUND',
        label: 'Knowledge Pack Binding',
        status: 'BLOCKED',
        message: 'All required Outcome Studio knowledge packs must be active before runtime reasoning.',
        blockerReason: 'KNOWLEDGE_PACK_BINDING_MISSING',
      },
      {
        code: 'PROMPT_PERSISTENCE_READY',
        label: 'Prompt Persistence',
        status: 'BLOCKED',
        message: 'Prompt persistence remains blocked until the session readiness gate passes.',
        blockerReason: 'OUTCOME_SESSION_BLOCKED',
      },
      {
        code: 'RESPONSE_GENERATION_ENGINE',
        label: 'Response Generation Engine',
        status: 'BLOCKED',
        message: 'Assistant response generation is blocked until source, truth, knowledge-pack, and session gates pass.',
        blockerReason: 'PRE_GENERATION_GATES_BLOCKED',
      },
    ],
  },
  packBinding: {
    status: 'BLOCKED',
    mode: 'REGISTRY_RESOLUTION',
    summary: 'Knowledge Pack Registry activation is required before Outcome Studio sessions can start.',
    activePacks: [],
    sourceBundle: {
      status: 'RETIRED',
      sourceDocuments: [],
    },
    requiredPacks: [
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
    ],
  },
  conversation: {
    enabled: false,
    disabledReason: 'Outcome Studio requires active Outcome Studio knowledge pack bindings before sessions can start.',
    promptMaxLength: 2000,
    allowedActions: [],
  },
  sourceOutputs: [],
  sessions: [],
  assets: [],
}

const buildReadyOutcomeStudioSafetyGates = ({ responseGenerationAvailable = false } = {}) => ({
  ...outcomeStudioPayload.safetyGates,
  status: responseGenerationAvailable ? 'PASSED' : 'BLOCKED',
  responseGenerationAvailable,
  passedCount: responseGenerationAvailable ? 5 : 4,
  blockedCount: responseGenerationAvailable ? 0 : 1,
  summary: responseGenerationAvailable
    ? 'All Outcome Studio safety gates are passed.'
    : 'Outcome Studio can preserve governed prompts when session readiness passes, but response generation remains blocked until all pre-generation gates pass.',
  gates: outcomeStudioPayload.safetyGates.gates.map((gate) => {
    if (gate.code === 'KNOWLEDGE_PACKS_BOUND') {
      return {
        code: gate.code,
        label: gate.label,
        status: 'PASSED',
        message: 'All required Outcome Studio knowledge packs are active for runtime binding.',
      }
    }

    if (gate.code === 'PROMPT_PERSISTENCE_READY') {
      return {
        code: gate.code,
        label: gate.label,
        status: 'PASSED',
        message: 'Customer prompts can be persisted against an active governed session.',
      }
    }

    if (gate.code === 'RESPONSE_GENERATION_ENGINE' && responseGenerationAvailable) {
      return {
        code: gate.code,
        label: gate.label,
        status: 'PASSED',
        message: 'Governed response generation can run for active current sessions.',
      }
    }

    return gate
  }),
})

const getBackendTruthCertificationLevelKeys = () => {
  const constantsPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../VMF-v-1-api/src/constants/runtimeTruthQuality.js',
  )
  const constantsSource = readFileSync(constantsPath, 'utf8')
  const levelsMatch = constantsSource.match(
    /export const TRUTH_CERTIFICATION_LEVELS = Object\.freeze\(\{([\s\S]*?)\n\}\)/,
  )
  expect(levelsMatch).not.toBeNull()
  return Array
    .from(levelsMatch[1].matchAll(/^\s{2}([A-Z_]+): Object\.freeze\(\{/gm))
    .map(([, levelKey]) => levelKey)
}

const getFrontendTruthCertificationVariantKeys = () => {
  const workspacePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    './RuntimeWorkspace.jsx',
  )
  const workspaceSource = readFileSync(workspacePath, 'utf8')
  const variantsMatch = workspaceSource.match(
    /const TRUTH_CERTIFICATION_VARIANTS = Object\.freeze\(\{([\s\S]*?)\n\}\)/,
  )
  expect(variantsMatch).not.toBeNull()
  return Array
    .from(variantsMatch[1].matchAll(/^\s{2}([A-Z_]+): /gm))
    .map(([, levelKey]) => levelKey)
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

function mockActiveOutcomeStudioSession({
  drafts = [],
  messages = [],
  truthCurrentness = 'CURRENT',
} = {}) {
  const activeSession = {
    sessionId: 'out_sess_active_fixture',
    status: 'ACTIVE',
    sourceOutputAssetId: 'out_asset_test',
    sourceOutputTypeKey: 'EXECUTIVE_BRIEF',
    sourceOutputTypeLabel: 'Executive Brief',
    knowledgePackBinding: {
      status: 'BOUND',
      activeCount: 5,
      requiredCount: 5,
    },
  }
  const readyOutcomeStudioPayload = {
    ...outcomeStudioPayload,
    readiness: {
      ...outcomeStudioPayload.readiness,
      state: 'READY',
      canStartSession: true,
      canReason: true,
      blockers: [],
      safetyGates: {
        ...outcomeStudioPayload.readiness.safetyGates,
        responseGenerationAvailable: true,
        passedCount: 5,
        blockedCount: 0,
      },
    },
    safetyGates: buildReadyOutcomeStudioSafetyGates({ responseGenerationAvailable: true }),
    conversation: {
      ...outcomeStudioPayload.conversation,
      enabled: true,
      disabledReason: '',
    },
    sessions: [activeSession],
  }
  useGetRuntimeOutcomeStudioQuery.mockReturnValue({
    data: { data: readyOutcomeStudioPayload },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: refetchOutcomeStudio,
  })
  useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
    data: { data: readyOutcomeStudioPayload.readiness },
    isLoading: false,
    isFetching: false,
    error: null,
  })
  useGetRuntimeOutcomeSessionQuery.mockReturnValue({
    data: {
      data: {
        ...activeSession,
        truthSignature: {
          status: 'PROJECTED',
          currentness: truthCurrentness,
        },
        messages,
        drafts,
      },
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: refetchOutcomeStudioSession,
  })
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
    refetchOutputLab.mockReset()
    refetchOutcomeStudio.mockReset()
    refetchOutcomeStudioSession.mockReset()
    mutateRuntimeState.mockReset()
    unwrapMutation.mockReset()
    executeRuntimeAction.mockReset()
    unwrapAction.mockReset()
    createRuntimeOutcomeSession.mockReset()
    unwrapCreateRuntimeOutcomeSession.mockReset()
    submitRuntimeOutcomeMessage.mockReset()
    unwrapSubmitRuntimeOutcomeMessage.mockReset()
    generateRuntimeOutcomeResponse.mockReset()
    unwrapGenerateRuntimeOutcomeResponse.mockReset()
    updateRuntimeOutcomeSessionFromLatestTruth.mockReset()
    unwrapUpdateRuntimeOutcomeSessionFromLatestTruth.mockReset()
    getRuntimeOutcomeAssetDetail.mockReset()
    getRuntimeOutcomeAssetPreview.mockReset()
    createRuntimeOutputRequest.mockReset()
    unwrapCreateRuntimeOutputRequest.mockReset()
    createRuntimeRevision.mockReset()
    unwrapCreateRuntimeRevision.mockReset()
    generateRuntimeOutputRequest.mockReset()
    unwrapGenerateRuntimeOutputRequest.mockReset()
    exportRuntimeOutputAsset.mockReset()
    unwrapExportRuntimeOutputAsset.mockReset()
    exportRuntimeOutcomeAsset.mockReset()
    unwrapExportRuntimeOutcomeAsset.mockReset()
    publishRuntimeOutcomeAsset.mockReset()
    unwrapPublishRuntimeOutcomeAsset.mockReset()
    approveRuntimeOutcomeDraft.mockReset()
    unwrapApproveRuntimeOutcomeDraft.mockReset()
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
    reviewAllRuntimeSectionEvidence.mockReset()
    unwrapReviewAllRuntimeSectionEvidence.mockReset()
    updateRuntimeSectionEvidence.mockReset()
    unwrapUpdateRuntimeSectionEvidence.mockReset()
    clearRuntimeSectionEvidence.mockReset()
    unwrapClearRuntimeSectionEvidence.mockReset()
    acceptRuntimeSection.mockReset()
    unwrapAcceptSection.mockReset()
    window.confirm = vi.fn(() => {
      throw new Error('Native confirm should not be used for Runtime Workspace actions.')
    })
    URL.createObjectURL = vi.fn(() => 'blob:output-lab-export')
    URL.revokeObjectURL = vi.fn()
    HTMLAnchorElement.prototype.click = vi.fn()
    unwrapMutation.mockResolvedValue({ data: { mutation: { runtimePath: 'framework_state.sections.customer_problem' } } })
    mutateRuntimeState.mockReturnValue({ unwrap: unwrapMutation })
    unwrapAction.mockResolvedValue({ data: { action: { actionKey: 'SUBMIT_FOR_REVIEW' } } })
    executeRuntimeAction.mockReturnValue({ unwrap: unwrapAction })
    unwrapCreateRuntimeOutcomeSession.mockResolvedValue({ data: { sessionId: 'outcome_session_test' } })
    createRuntimeOutcomeSession.mockReturnValue({ unwrap: unwrapCreateRuntimeOutcomeSession })
    unwrapSubmitRuntimeOutcomeMessage.mockResolvedValue({ data: { messageId: 'out_msg_test' } })
    submitRuntimeOutcomeMessage.mockReturnValue({ unwrap: unwrapSubmitRuntimeOutcomeMessage })
    unwrapGenerateRuntimeOutcomeResponse.mockResolvedValue({ data: { messageId: 'out_msg_test' } })
    generateRuntimeOutcomeResponse.mockReturnValue({ unwrap: unwrapGenerateRuntimeOutcomeResponse })
    unwrapUpdateRuntimeOutcomeSessionFromLatestTruth.mockResolvedValue({
      data: {
        sessionId: 'out_sess_active_fixture',
        truthSignatureId: 'truth_sig_updated_fixture',
        truthSignature: {
          currentness: 'CURRENT',
        },
      },
    })
    updateRuntimeOutcomeSessionFromLatestTruth.mockReturnValue({
      unwrap: unwrapUpdateRuntimeOutcomeSessionFromLatestTruth,
    })
    unwrapPublishRuntimeOutcomeAsset.mockResolvedValue({
      data: {
        outcomeAssetId: 'outcome_asset_existing_fixture',
        status: 'PUBLISHED',
      },
    })
    publishRuntimeOutcomeAsset.mockReturnValue({
      unwrap: unwrapPublishRuntimeOutcomeAsset,
    })
    unwrapApproveRuntimeOutcomeDraft.mockResolvedValue({
      data: {
        draft: {
          draftId: 'outcome_draft_existing_fixture',
          status: 'APPROVED',
          currentIterationId: 'outcome_draft_iteration_current_fixture',
        },
        asset: {
          outcomeAssetId: 'outcome_asset_existing_fixture',
          status: 'GENERATED',
          currentVersionId: 'outcome_asset_version_existing_fixture',
        },
        assetVersion: {
          outcomeAssetVersionId: 'outcome_asset_version_existing_fixture',
          versionNumber: 1,
        },
      },
    })
    approveRuntimeOutcomeDraft.mockReturnValue({
      unwrap: unwrapApproveRuntimeOutcomeDraft,
    })
    unwrapCreateRuntimeOutputRequest.mockResolvedValue({ data: { outputRequestId: 'out_req_test' } })
    createRuntimeOutputRequest.mockReturnValue({ unwrap: unwrapCreateRuntimeOutputRequest })
    unwrapCreateRuntimeRevision.mockResolvedValue({
      data: {
        id: 'runtime-revision-2',
        runtimeInstanceKey: 'value-narrative-001-rev-2',
        runtimeType: 'VALUE_NARRATIVE',
      },
    })
    createRuntimeRevision.mockReturnValue({ unwrap: unwrapCreateRuntimeRevision })
    unwrapGenerateRuntimeOutputRequest.mockResolvedValue({ data: { outputAssetId: 'out_asset_test' } })
    generateRuntimeOutputRequest.mockReturnValue({ unwrap: unwrapGenerateRuntimeOutputRequest })
    unwrapExportRuntimeOutputAsset.mockResolvedValue({
      data: {
        format: 'MARKDOWN',
        filename: 'value-narrative-001-executive-brief.md',
        mimeType: 'text/markdown',
        content: '# Executive Brief',
      },
    })
    exportRuntimeOutputAsset.mockReturnValue({ unwrap: unwrapExportRuntimeOutputAsset })
    unwrapExportRuntimeOutcomeAsset.mockResolvedValue({
      data: {
        format: 'MARKDOWN',
        filename: 'value-narrative-001-governed-board-narrative.md',
        mimeType: 'text/markdown',
        content: '# Governed Board Narrative',
      },
    })
    exportRuntimeOutcomeAsset.mockReturnValue({ unwrap: unwrapExportRuntimeOutcomeAsset })
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
    unwrapReviewAllRuntimeSectionEvidence.mockResolvedValue({ data: { section: { sectionEvidence: { status: 'ACCEPTED' } } } })
    reviewAllRuntimeSectionEvidence.mockReturnValue({ unwrap: unwrapReviewAllRuntimeSectionEvidence })
    unwrapUpdateRuntimeSectionEvidence.mockResolvedValue({ data: { section: { sectionEvidence: { status: 'PENDING_REVIEW' } } } })
    updateRuntimeSectionEvidence.mockReturnValue({ unwrap: unwrapUpdateRuntimeSectionEvidence })
    unwrapClearRuntimeSectionEvidence.mockResolvedValue({ data: { section: { sectionEvidence: { status: 'EMPTY' } } } })
    clearRuntimeSectionEvidence.mockReturnValue({ unwrap: unwrapClearRuntimeSectionEvidence })
    unwrapAcceptSection.mockResolvedValue({ data: { section: { accepted: { content: 'Accepted final.' } } } })
    acceptRuntimeSection.mockReturnValue({ unwrap: unwrapAcceptSection })
    useAcceptRuntimeDiscoveryMutation.mockReturnValue([acceptRuntimeDiscovery, { isLoading: false }])
    useAcceptRuntimeSectionMutation.mockReturnValue([acceptRuntimeSection, { isLoading: false }])
    useApproveRuntimeOutcomeDraftMutation.mockReturnValue([approveRuntimeOutcomeDraft, { isLoading: false }])
    useClearRuntimeSectionEvidenceMutation.mockReturnValue([clearRuntimeSectionEvidence, { isLoading: false }])
    useCreateRuntimeOutcomeSessionMutation.mockReturnValue([createRuntimeOutcomeSession, { isLoading: false }])
    useSubmitRuntimeOutcomeMessageMutation.mockReturnValue([submitRuntimeOutcomeMessage, { isLoading: false }])
    useGenerateRuntimeOutcomeResponseMutation.mockReturnValue([generateRuntimeOutcomeResponse, { isLoading: false }])
    useUpdateRuntimeOutcomeSessionFromLatestTruthMutation.mockReturnValue([
      updateRuntimeOutcomeSessionFromLatestTruth,
      { isLoading: false },
    ])
    useCreateRuntimeOutputRequestMutation.mockReturnValue([createRuntimeOutputRequest, { isLoading: false }])
    useCreateRuntimeRevisionMutation.mockReturnValue([createRuntimeRevision, { isLoading: false }])
    useExecuteRuntimeActionMutation.mockReturnValue([executeRuntimeAction, { isLoading: false }])
    useGenerateRuntimeOutputRequestMutation.mockReturnValue([generateRuntimeOutputRequest, { isLoading: false }])
    useResetRuntimeDiscoveryMutation.mockReturnValue([resetRuntimeDiscovery, { isLoading: false }])
    useReviewRuntimeDiscoveryEvidenceMutation.mockReturnValue([reviewRuntimeDiscoveryEvidence, { isLoading: false }])
    useReviewAllRuntimeSectionEvidenceMutation.mockReturnValue([reviewAllRuntimeSectionEvidence, { isLoading: false }])
    useReviewRuntimeSectionEvidenceMutation.mockReturnValue([reviewRuntimeSectionEvidence, { isLoading: false }])
    useUpdateRuntimeSectionEvidenceMutation.mockReturnValue([updateRuntimeSectionEvidence, { isLoading: false }])
    useGetRuntimeEvidenceQuery.mockReturnValue({
      data: null,
      isFetching: false,
      error: null,
    })
    useGetRuntimeIntelligenceGraphQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetRuntimeOutputLabQuery.mockReturnValue({
      data: { data: outputLabPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutputLab,
    })
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: outcomeStudioPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
      data: { data: outcomeStudioPayload.readiness },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudioSession,
    })
    useLazyGetRuntimeOutcomeAssetQuery.mockReturnValue([
      getRuntimeOutcomeAssetDetail,
      {
        data: null,
        isFetching: false,
        error: null,
      },
    ])
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([
      getRuntimeOutcomeAssetPreview,
      {
        data: null,
        isFetching: false,
        error: null,
      },
    ])
    useGetRuntimeTruthQualityQuery.mockReturnValue({
      data: { data: truthQualityPayload },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useLazyExportRuntimeOutcomeAssetQuery.mockReturnValue([exportRuntimeOutcomeAsset, { isLoading: false }])
    useLazyExportRuntimeOutputAssetQuery.mockReturnValue([exportRuntimeOutputAsset, { isLoading: false }])
    useMutateRuntimeStateMutation.mockReturnValue([mutateRuntimeState, { isLoading: false }])
    usePublishRuntimeOutcomeAssetMutation.mockReturnValue([publishRuntimeOutcomeAsset, { isLoading: false }])
    useUpdateRuntimeDiscoveryInputsMutation.mockReturnValue([updateRuntimeDiscoveryInputs, { isLoading: false }])
    useGetRuntimeRendererQuery.mockReturnValue({
      data: { data: rendererPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })
  })

  it('keeps Truth Quality UI variants aligned with backend certification levels', () => {
    expect(getFrontendTruthCertificationVariantKeys().sort()).toEqual(
      getBackendTruthCertificationLevelKeys().sort(),
    )
  })

  it('renders server-projected runtime sections, actions, signals, activity, and diagnostics', async () => {
    renderRuntimeWorkspace()

    expect(useGetRuntimeRendererQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: false },
    )
    expect(useGetRuntimeTruthQualityQuery).toHaveBeenCalledWith(
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

  it('creates a runtime revision from the renderer revision contract', async () => {
    const user = userEvent.setup()
    const lockedRevisionRenderer = {
      ...rendererPayload,
      runtimeInstance: {
        ...rendererPayload.runtimeInstance,
        status: 'LOCKED',
      },
      lifecycle: {
        stage: 'LOCKED',
        runtimeStatus: 'LOCKED',
      },
      publish: {
        state: 'PUBLISHED',
        published: true,
        snapshot: {
          snapshotId: 'publish-snapshot-1',
          snapshotHash: 'sha256:publish',
        },
        outputEligibility: {
          outputEligible: true,
        },
      },
      lock: {
        state: 'LOCKED',
        locked: true,
        snapshot: {
          snapshotId: 'lock-snapshot-1',
          snapshotHash: 'sha256:lock',
        },
        replayAnchor: {
          replayAnchorId: 'replay-anchor-1',
          replayAnchorHash: 'sha256:replay',
        },
      },
      revision: {
        contractVersion: 'runtime-revision.v1',
        revisionNumber: 1,
        rootRuntimeId: 'runtime-1',
        rootRuntimeInstanceKey: 'value-narrative-001',
        parentRuntimeId: null,
        parentRuntimeInstanceKey: '',
        lineage: [
          {
            runtimeInstanceId: 'runtime-1',
            runtimeInstanceKey: 'value-narrative-001',
            revisionNumber: 1,
            relationship: 'CURRENT',
            status: 'LOCKED',
            lifecycleStage: 'LOCKED',
          },
        ],
        createRevision: {
          enabled: true,
          disabledReason: '',
          expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        },
        sourceProof: {
          publishSnapshotId: 'publish-snapshot-1',
          lockSnapshotId: 'lock-snapshot-1',
          replayAnchorId: 'replay-anchor-1',
        },
      },
    }

    useGetRuntimeRendererQuery.mockReturnValue({
      data: { data: lockedRevisionRenderer },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    expect(screen.getByRole('heading', { name: 'Revision History' })).toBeInTheDocument()
    expect(screen.getByText('Current R1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create revision/i }))
    const dialog = screen.getByRole('dialog', { name: /create revision/i })
    await user.type(within(dialog).getByLabelText(/revision reason/i), 'Refresh for Q3 launch')
    await user.click(within(dialog).getByRole('button', { name: /create revision/i }))

    await waitFor(() => {
      expect(createRuntimeRevision).toHaveBeenCalledWith({
        runtimeInstanceId: 'value-narrative-001',
        body: {
          expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
          reason: 'Refresh for Q3 launch',
        },
      })
    })
    await waitFor(() => {
      expect(useGetRuntimeRendererQuery).toHaveBeenCalledWith(
        { runtimeInstanceId: 'value-narrative-001-rev-2' },
        { skip: false },
      )
    })
  })

  it('renders revision history runtime rows as workspace links', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          runtimeInstance: {
            ...rendererPayload.runtimeInstance,
            status: 'LOCKED',
          },
          revision: {
            contractVersion: 'runtime-revision.v1',
            revisionNumber: 1,
            lineage: [
              {
                runtimeInstanceId: 'runtime-1',
                runtimeInstanceKey: 'value-narrative-001',
                revisionNumber: 1,
                relationship: 'CURRENT',
                status: 'LOCKED',
                lifecycleStage: 'LOCKED',
              },
              {
                runtimeInstanceId: 'runtime-2',
                runtimeInstanceKey: 'value-narrative-001-rev-2',
                revisionNumber: 2,
                relationship: 'CHILD',
                status: 'ACTIVE',
                lifecycleStage: 'DRAFT',
              },
            ],
            createRevision: {
              enabled: false,
              disabledReason: 'A revision already exists for this locked runtime.',
              expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
              existingChildRuntimeInstanceKey: 'value-narrative-001-rev-2',
            },
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace('/app/runtime/value-narrative-001')

    const revisionHistory = screen.getByRole('list', { name: /runtime revision history/i })
    expect(within(revisionHistory).getByRole('link', { name: 'Current R1' }))
      .toHaveAttribute('href', '/app/runtime/value-narrative-001')
    expect(within(revisionHistory).getByRole('link', { name: 'Child R2' }))
      .toHaveAttribute('href', '/app/runtime/value-narrative-001-rev-2')
  })

  it('clears revision reason when the create revision dialog is closed', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          runtimeInstance: {
            ...rendererPayload.runtimeInstance,
            status: 'LOCKED',
          },
          lifecycle: {
            stage: 'LOCKED',
            runtimeStatus: 'LOCKED',
          },
          publish: {
            state: 'PUBLISHED',
            published: true,
            snapshot: {
              snapshotId: 'publish-snapshot-1',
              snapshotHash: 'sha256:publish',
            },
          },
          lock: {
            state: 'LOCKED',
            locked: true,
            snapshot: {
              snapshotId: 'lock-snapshot-1',
              snapshotHash: 'sha256:lock',
            },
            replayAnchor: {
              replayAnchorId: 'replay-anchor-1',
              replayAnchorHash: 'sha256:replay',
            },
          },
          revision: {
            contractVersion: 'runtime-revision.v1',
            revisionNumber: 1,
            lineage: [],
            createRevision: {
              enabled: true,
              disabledReason: '',
              expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
            },
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace('/app/runtime/value-narrative-001')

    await user.click(screen.getByRole('button', { name: /create revision/i }))
    let dialog = screen.getByRole('dialog', { name: /create revision/i })
    await user.type(within(dialog).getByLabelText(/revision reason/i), 'Stale reason')
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }))

    await user.click(screen.getByRole('button', { name: /create revision/i }))
    dialog = screen.getByRole('dialog', { name: /create revision/i })
    expect(within(dialog).getByLabelText(/revision reason/i)).toHaveValue('')
  })

  it('shows renderer-projected revision disabled reasons', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          revision: {
            contractVersion: 'runtime-revision.v1',
            revisionNumber: 1,
            lineage: [],
            createRevision: {
              enabled: false,
              disabledReason: 'Lock snapshot and replay anchor proof are required before creating a revision.',
              expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
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

    expect(screen.getByRole('button', { name: /create revision/i })).toBeDisabled()
    expect(screen.getByText('Lock snapshot and replay anchor proof are required before creating a revision.')).toBeInTheDocument()
  })

  it('renders Output Lab as blocked when locked canonical output eligibility is missing', async () => {
    const user = userEvent.setup()
    renderRuntimeWorkspace()

    expect(useGetRuntimeOutputLabQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: false },
    )
    await user.click(screen.getByRole('button', { name: /output lab/i }))

    const main = screen.getByRole('main', { name: /guided execution sections/i })
    expect(within(main).getByRole('heading', { name: /^output lab$/i })).toBeInTheDocument()
    expect(within(main).getByRole('tablist', { name: /output lab sections/i })).toBeInTheDocument()
    expect(within(main).getByRole('tab', { name: /readiness/i })).toHaveAttribute('aria-selected', 'true')
    expect(within(main).getAllByText('Locked canonical runtime truth is required before Output Lab generation.').length)
      .toBeGreaterThanOrEqual(1)
    expect(within(main).getByRole('region', { name: /output lab readiness/i })).toHaveTextContent('Not eligible')

    await user.click(within(main).getByRole('tab', { name: /composition/i }))
    expect(within(main).getByRole('button', { name: /^generate$/i })).toBeDisabled()
  })

  it('renders Outcome Studio as a blocked governed reasoning surface', async () => {
    const user = userEvent.setup()
    renderRuntimeWorkspace()

    expect(useGetRuntimeOutcomeStudioReadinessQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: false },
    )
    expect(useGetRuntimeOutcomeStudioQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: true },
    )
    await user.click(screen.getByRole('button', { name: /outcome studio/i }))

    expect(useGetRuntimeOutcomeStudioQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: false },
    )

    const main = screen.getByRole('main', { name: /guided execution sections/i })
    expect(within(main).getByRole('heading', { name: /^outcome studio$/i })).toBeInTheDocument()
    expect(within(main).getByRole('tablist', { name: /outcome studio sections/i })).toBeInTheDocument()
    const readinessRegion = within(main).getByRole('region', { name: /outcome studio readiness/i })
    expect(readinessRegion)
      .toHaveTextContent('Adaptive Reasoning Layer must be active before Outcome Studio sessions can start.')
    expect(readinessRegion)
      .toHaveTextContent('Rendering Layer must be active before Outcome Studio sessions can start.')
    expect(readinessRegion)
      .toHaveTextContent('Output Schemas must be active before Outcome Studio sessions can start.')
    expect(readinessRegion)
      .toHaveTextContent('Truth Certification must be active before Outcome Studio sessions can start.')
    expect(readinessRegion)
      .toHaveTextContent('Mandatory safeguards blocked')
    expect(readinessRegion)
      .not.toHaveTextContent(/\d+ active \/ \d+ required/i)
    expect(readinessRegion)
      .toHaveTextContent('No source documents')
    expect(readinessRegion)
      .toHaveTextContent('2 passed / 5 gates')
    const safetyGates = within(readinessRegion).getByRole('list', { name: /outcome studio safety gates/i })
    expect(safetyGates).toHaveTextContent('Source Output Binding')
    expect(safetyGates).toHaveTextContent('Truth Signature Binding')
    expect(safetyGates).toHaveTextContent('Knowledge Pack Binding')
    expect(safetyGates).toHaveTextContent('Prompt Persistence')
    expect(safetyGates).toHaveTextContent('Response Generation Engine')
    expect(safetyGates).toHaveTextContent('Assistant response generation is blocked until source, truth, knowledge-pack, and session gates pass.')
    expect(safetyGates).toHaveTextContent('Pre Generation Gates Blocked')
    expect(readinessRegion)
      .not.toHaveTextContent('output-schemas-pack-v1.yaml')
    expect(readinessRegion)
      .not.toHaveTextContent('truth-certification-pack-v1.yaml')

    await user.click(within(main).getByRole('tab', { name: /truth binding/i }))
    const truthBinding = within(main).getByRole('region', { name: /outcome studio truth binding/i })
    expect(within(truthBinding).getByText('Strategic Truth')).toBeInTheDocument()
    expect(truthBinding).toHaveTextContent('runtime-trut...-fixture')
    expect(truthBinding).toHaveTextContent('runtime-repl...tput-lab')
    expect(within(truthBinding).getByRole('region', { name: /outcome studio truth signature projection/i }))
      .toHaveTextContent('Current')
    expect(within(truthBinding).getByRole('list', { name: /outcome studio truth signature evidence/i }))
      .toHaveTextContent('Projected From Runtime Evidence')
    expect(within(truthBinding).getByRole('list', { name: /outcome studio truth signature evidence/i }))
      .toHaveTextContent('out_asset_test')
    const truthUpdateButton = within(truthBinding).getByRole('button', { name: /update from latest truth/i })
    expect(truthUpdateButton).toBeDisabled()
    const truthUpdateReason = document.getElementById(truthUpdateButton.getAttribute('aria-describedby'))
    expect(truthUpdateReason).toHaveTextContent(
      'Update from latest truth requires an active Outcome Studio session.',
    )
    expect(truthBinding).toHaveTextContent('Asset out_asset_test')
    expect(truthBinding).toHaveTextContent('Formats MARKDOWN, JSON')

    await user.click(within(main).getByRole('tab', { name: /conversation/i }))
    expect(within(main).getByRole('textbox', { name: /prompt/i })).toBeDisabled()
    const startSessionButton = within(main).getByRole('button', { name: /start session/i })
    expect(startSessionButton).toBeDisabled()
    await user.click(startSessionButton)
    expect(createRuntimeOutcomeSession).not.toHaveBeenCalled()
    expect(within(main).getAllByText(
      'Outcome Studio requires active Outcome Studio knowledge pack bindings before sessions can start.',
    ).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Raw generated output must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw prompt payload must not render.')).not.toBeInTheDocument()
  })

  it('submits Outcome Studio session starts only when readiness allows it', async () => {
    const user = userEvent.setup()
    const readyOutcomeStudioPayload = {
      ...outcomeStudioPayload,
      readiness: {
        ...outcomeStudioPayload.readiness,
        state: 'READY',
        canStartSession: true,
        canReason: false,
        summary: 'Outcome Studio can start governed sessions; response generation remains blocked until all pre-generation gates pass.',
        blockers: [],
        safetyGates: {
          ...outcomeStudioPayload.readiness.safetyGates,
          passedCount: 4,
          blockedCount: 1,
        },
      },
      safetyGates: buildReadyOutcomeStudioSafetyGates(),
      conversation: {
        ...outcomeStudioPayload.conversation,
        enabled: true,
        disabledReason: '',
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload.readiness },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))
    await user.type(within(main).getByRole('textbox', { name: /prompt/i }), 'Draft the governed outcome.')
    await user.click(within(main).getByRole('button', { name: /start session/i }))

    await waitFor(() => {
      expect(createRuntimeOutcomeSession).toHaveBeenCalledWith({
        runtimeInstanceId: 'value-narrative-001',
        body: {
          sourceOutputAssetId: 'out_asset_test',
          prompt: 'Draft the governed outcome.',
        },
      })
    })
    expect(await within(main).findByText('Outcome Studio session started.')).toBeInTheDocument()
    expect(refetchOutcomeStudio).toHaveBeenCalled()
  })

  it('renders Outcome Studio prompt history and submits prompts for active sessions', async () => {
    const user = userEvent.setup()
    const activeSession = {
      sessionId: 'out_sess_active_fixture',
      status: 'ACTIVE',
      sourceOutputAssetId: 'out_asset_test',
      sourceOutputTypeKey: 'EXECUTIVE_BRIEF',
      sourceOutputTypeLabel: 'Executive Brief',
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
        boundAt: '2026-06-15T08:20:00.000Z',
      },
      prompt: 'Initial governed prompt.',
      startedAt: '2026-06-15T08:20:00.000Z',
      lastActivityAt: '2026-06-15T08:24:00.000Z',
    }
    const readyOutcomeStudioPayload = {
      ...outcomeStudioPayload,
      readiness: {
        ...outcomeStudioPayload.readiness,
        state: 'READY',
        canStartSession: true,
        canReason: true,
        summary: 'Outcome Studio can start governed sessions.',
        blockers: [],
        safetyGates: {
          ...outcomeStudioPayload.readiness.safetyGates,
          responseGenerationAvailable: true,
          passedCount: 5,
          blockedCount: 0,
        },
      },
      safetyGates: buildReadyOutcomeStudioSafetyGates({ responseGenerationAvailable: true }),
      packBinding: {
        ...outcomeStudioPayload.packBinding,
        status: 'BOUND',
        activePacks: outcomeStudioPayload.packBinding.requiredPacks.map((pack) => ({
          ...pack,
          status: 'ACTIVE',
          runtimeBindable: true,
        })),
        requiredPacks: outcomeStudioPayload.packBinding.requiredPacks.map((pack) => ({
          ...pack,
          status: 'ACTIVE',
          runtimeBindable: true,
        })),
      },
      conversation: {
        ...outcomeStudioPayload.conversation,
        enabled: true,
        disabledReason: '',
      },
      sessions: [activeSession],
    }
    const sessionDetail = {
      ...activeSession,
      truthSignature: {
        status: 'PROJECTED',
        currentness: 'CURRENT',
      },
      messages: [
        {
          messageId: 'out_msg_existing_fixture',
          sessionId: 'out_sess_active_fixture',
          role: 'USER',
          status: 'SUBMITTED',
          responseStatus: 'PENDING_RESPONSE',
          prompt: 'Existing governed prompt.',
          submittedAt: '2026-06-15T08:24:00.000Z',
          sourceOutput: {
            markdown: 'Raw message source Markdown must not render.',
          },
          generatedResponse: 'Raw generated response must not render.',
        },
      ],
      drafts: [
        {
          draftId: 'outcome_draft_existing_fixture',
          sessionId: 'out_sess_active_fixture',
          status: 'ACTIVE',
          outputTypeKey: 'EXECUTIVE_BRIEF',
          outputTypeLabel: 'Executive Brief',
          title: 'Executive Brief Draft',
          currentIterationId: 'outcome_draft_iteration_current_fixture',
          currentIterationNumber: 2,
          truthSignature: {
            status: 'PROJECTED',
            currentness: 'CURRENT',
          },
          knowledgePackBinding: {
            status: 'READY',
            resolvedCount: 7,
            resolution: {
              status: 'READY',
              resolvedCount: 7,
              requestedOutputTypeKey: 'executive_brief',
            },
          },
          customerContent: {
            markdown: 'Raw draft content must not render.',
          },
        },
      ],
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload.readiness },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: sessionDetail },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudioSession,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    expect(useGetRuntimeOutcomeSessionQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001', sessionId: 'out_sess_active_fixture' },
      { skip: false },
    )
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))
    const sessionRegion = within(main).getByRole('region', { name: /outcome studio active session/i })
    expect(sessionRegion).toHaveTextContent('Executive Brief')
    expect(sessionRegion).toHaveTextContent('Mandatory safeguards bound')
    expect(sessionRegion).not.toHaveTextContent(/\d+ active \/ \d+ required/i)
    const history = within(sessionRegion).getByRole('list', { name: /outcome studio prompt history/i })
    expect(history).toHaveTextContent('Existing governed prompt.')
    expect(history).toHaveTextContent('Pending Response')
    expect(history).toHaveTextContent('Ready for governed response generation.')
    const draftRegion = within(sessionRegion).getByRole('region', { name: /outcome studio working drafts/i })
    expect(draftRegion).toHaveTextContent('Executive Brief Draft')
    expect(draftRegion).toHaveTextContent('Current iteration 2')
    expect(draftRegion).toHaveTextContent('Knowledge Ready / 7 packs resolved')
    expect(draftRegion).toHaveTextContent('Approve this draft to create a governed asset version.')
    expect(screen.queryByText('Raw draft content must not render.')).not.toBeInTheDocument()
    const generateResponseButton = within(history).getByRole('button', { name: /generate response/i })
    expect(generateResponseButton).toBeEnabled()
    expect(screen.queryByText('Raw message source Markdown must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw generated response must not render.')).not.toBeInTheDocument()

    await user.click(generateResponseButton)

    await waitFor(() => {
      expect(generateRuntimeOutcomeResponse).toHaveBeenCalledWith({
        runtimeInstanceId: 'value-narrative-001',
        sessionId: 'out_sess_active_fixture',
        messageId: 'out_msg_existing_fixture',
        body: {},
      })
    })
    expect(await within(main).findByText('Outcome Studio response generated.')).toBeInTheDocument()

    const promptInput = within(main).getByRole('textbox', { name: /prompt/i })
    const submitButton = within(main).getByRole('button', { name: /submit prompt/i })
    expect(promptInput).toBeEnabled()
    expect(submitButton).toBeDisabled()

    await user.type(promptInput, 'Continue the governed outcome.')
    expect(submitButton).toBeEnabled()
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitRuntimeOutcomeMessage).toHaveBeenCalledWith({
        runtimeInstanceId: 'value-narrative-001',
        sessionId: 'out_sess_active_fixture',
        body: {
          prompt: 'Continue the governed outcome.',
        },
      })
    })
    expect(await within(main).findByText('Outcome Studio prompt submitted.')).toBeInTheDocument()
    await waitFor(() => {
      expect(promptInput).toHaveValue('')
    })
    expect(refetchOutcomeStudioSession).toHaveBeenCalled()
    expect(refetchOutcomeStudio).toHaveBeenCalled()

    const approveDraftButton = within(draftRegion).getByRole('button', { name: /approve draft/i })
    expect(approveDraftButton).toBeEnabled()
    await user.click(approveDraftButton)

    await waitFor(() => {
      expect(approveRuntimeOutcomeDraft).toHaveBeenCalledWith({
        runtimeInstanceId: 'value-narrative-001',
        sessionId: 'out_sess_active_fixture',
        draftId: 'outcome_draft_existing_fixture',
        body: {},
      })
    })
    expect(await within(main).findByText('Outcome Studio draft approved into a governed asset version.')).toBeInTheDocument()
  })

  it('renders the Outcome Studio working-draft empty state', async () => {
    const user = userEvent.setup()
    mockActiveOutcomeStudioSession({ drafts: [] })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))

    const draftRegion = within(main).getByRole('region', { name: /outcome studio working drafts/i })
    expect(within(draftRegion).getByText('No working drafts')).toBeInTheDocument()
    expect(within(draftRegion).queryByRole('button', { name: /approve draft/i })).not.toBeInTheDocument()
  })

  it('blocks draft approval when the draft truth signature is not current', async () => {
    const user = userEvent.setup()
    mockActiveOutcomeStudioSession({
      truthCurrentness: 'STALE',
      drafts: [{
        draftId: 'outcome_draft_stale_fixture',
        sessionId: 'out_sess_active_fixture',
        status: 'ACTIVE',
        title: 'Stale Executive Brief Draft',
        currentIterationId: 'outcome_draft_iteration_stale_fixture',
        currentIterationNumber: 2,
        truthSignature: { status: 'PROJECTED', currentness: 'STALE' },
        knowledgePackBinding: { activeCount: 5, requiredCount: 5 },
      }],
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))

    const draftRegion = within(main).getByRole('region', { name: /outcome studio working drafts/i })
    expect(draftRegion).toHaveTextContent('Draft approval is blocked until the draft truth signature is current.')
    expect(within(draftRegion).getByRole('button', { name: /approve draft/i })).toBeDisabled()
  })

  it('surfaces draft approval failures without switching to a success state', async () => {
    const user = userEvent.setup()
    mockActiveOutcomeStudioSession({
      drafts: [{
        draftId: 'outcome_draft_failure_fixture',
        sessionId: 'out_sess_active_fixture',
        status: 'ACTIVE',
        title: 'Executive Brief Draft',
        currentIterationId: 'outcome_draft_iteration_failure_fixture',
        currentIterationNumber: 1,
        truthSignature: { status: 'PROJECTED', currentness: 'CURRENT' },
        knowledgePackBinding: { activeCount: 5, requiredCount: 5 },
      }],
    })
    unwrapApproveRuntimeOutcomeDraft.mockRejectedValue({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'This draft was already approved.',
          requestId: 'req-approve-race',
        },
      },
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))
    await user.click(within(main).getByRole('button', { name: /approve draft/i }))

    expect(await within(main).findByText('This draft was already approved. Reference: req-approve-race')).toBeInTheDocument()
    expect(within(main).queryByText('Outcome Studio draft approved into a governed asset version.')).not.toBeInTheDocument()
  })

  it('surfaces GRR provider-unavailable response generation failures without a success state', async () => {
    const user = userEvent.setup()
    const activeSession = {
      sessionId: 'out_sess_active_fixture',
      status: 'ACTIVE',
      sourceOutputAssetId: 'out_asset_test',
      sourceOutputTypeKey: 'EXECUTIVE_BRIEF',
      sourceOutputTypeLabel: 'Executive Brief',
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
      truthSignature: {
        status: 'PROJECTED',
        currentness: 'CURRENT',
      },
    }
    const readyOutcomeStudioPayload = {
      ...outcomeStudioPayload,
      readiness: {
        ...outcomeStudioPayload.readiness,
        state: 'READY',
        canStartSession: true,
        blockers: [],
        safetyGates: {
          ...outcomeStudioPayload.readiness.safetyGates,
          responseGenerationAvailable: true,
          passedCount: 5,
          blockedCount: 0,
        },
      },
      safetyGates: buildReadyOutcomeStudioSafetyGates({ responseGenerationAvailable: true }),
      packBinding: {
        ...outcomeStudioPayload.packBinding,
        status: 'BOUND',
        activePacks: outcomeStudioPayload.packBinding.requiredPacks.map((pack) => ({
          ...pack,
          status: 'ACTIVE',
          runtimeBindable: true,
        })),
        requiredPacks: outcomeStudioPayload.packBinding.requiredPacks.map((pack) => ({
          ...pack,
          status: 'ACTIVE',
          runtimeBindable: true,
        })),
      },
      conversation: {
        ...outcomeStudioPayload.conversation,
        enabled: true,
        disabledReason: '',
      },
      sessions: [activeSession],
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload.readiness },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...activeSession,
          messages: [
            {
              messageId: 'out_msg_existing_fixture',
              sessionId: 'out_sess_active_fixture',
              role: 'USER',
              status: 'SUBMITTED',
              responseStatus: 'PENDING_RESPONSE',
              prompt: 'Existing governed prompt.',
              submittedAt: '2026-06-15T08:24:00.000Z',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudioSession,
    })
    unwrapGenerateRuntimeOutcomeResponse.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'GRR_PROVIDER_UNAVAILABLE',
          message: 'Governed reasoning provider execution is not configured.',
          requestId: 'grr-ref-001',
          details: {
            reason: 'PROVIDER_UNAVAILABLE',
          },
        },
      },
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))
    const history = within(main).getByRole('list', { name: /outcome studio prompt history/i })
    await user.click(within(history).getByRole('button', { name: /generate response/i }))

    expect(await within(main).findByText(
      'Governed reasoning provider is not configured. Outcome Studio did not create a response or draft. Reference: grr-ref-001',
    )).toBeInTheDocument()
    expect(within(main).queryByText('Outcome Studio response generated.')).not.toBeInTheDocument()
    expect(refetchOutcomeStudioSession).not.toHaveBeenCalled()
    expect(refetchOutcomeStudio).not.toHaveBeenCalled()
  })

  it.each([
    {
      resolutionStatus: 'BLOCKED',
      expectedSummary: 'Knowledge resolution: Request-specific resolution blocked.',
      message: 'Outcome Studio could not resolve all required Knowledge Packs for this request.',
      requestId: 'knowledge-blocked-ref',
    },
    {
      resolutionStatus: 'AMBIGUOUS',
      expectedSummary: 'Knowledge resolution: Ambiguous request-specific resolution.',
      message: 'Outcome Studio found multiple equally eligible Knowledge Packs for this request.',
      requestId: 'knowledge-ambiguous-ref',
    },
  ])('surfaces $resolutionStatus request-specific Knowledge resolution failures', async ({
    expectedSummary,
    message,
    requestId,
    resolutionStatus,
  }) => {
    const user = userEvent.setup()
    mockActiveOutcomeStudioSession({
      messages: [{
        messageId: `out_msg_${resolutionStatus.toLowerCase()}_fixture`,
        sessionId: 'out_sess_active_fixture',
        role: 'USER',
        status: 'SUBMITTED',
        responseStatus: 'PENDING_RESPONSE',
        prompt: 'Generate a governed response.',
        submittedAt: '2026-06-15T08:24:00.000Z',
      }],
    })
    unwrapGenerateRuntimeOutcomeResponse.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message,
          requestId,
          details: {
            resolutionStatus,
            requestedOutputTypeKey: 'executive_brief',
          },
        },
      },
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))
    const history = within(main).getByRole('list', { name: /outcome studio prompt history/i })
    await user.click(within(history).getByRole('button', { name: /generate response/i }))

    expect(await within(main).findByText(
      `${expectedSummary} ${message} Reference: ${requestId}`,
    )).toBeInTheDocument()
    expect(within(main).queryByText('Outcome Studio response generated.')).not.toBeInTheDocument()
    expect(refetchOutcomeStudioSession).not.toHaveBeenCalled()
    expect(refetchOutcomeStudio).not.toHaveBeenCalled()
  })

  it('does not render an invalid request-specific Knowledge resolution count', async () => {
    const user = userEvent.setup()
    const invalidCounts = ['not-a-number', true, [7], 1.5]
    mockActiveOutcomeStudioSession({
      drafts: invalidCounts.map((resolvedCount, index) => ({
        draftId: `outcome_draft_invalid_count_${index}_fixture`,
        sessionId: 'out_sess_active_fixture',
        status: 'ACTIVE',
        title: `Executive Brief Draft ${index + 1}`,
        currentIterationId: `outcome_draft_iteration_invalid_count_${index}_fixture`,
        currentIterationNumber: 1,
        truthSignature: { status: 'PROJECTED', currentness: 'CURRENT' },
        knowledgePackBinding: {
          status: 'READY',
          resolvedCount,
        },
      })),
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))
    const draftRegion = within(main).getByRole('region', { name: /outcome studio working drafts/i })

    const draftRows = within(draftRegion).getAllByRole('listitem')
    expect(draftRows).toHaveLength(invalidCounts.length)
    draftRows.forEach((draftRow) => {
      expect(draftRow).toHaveTextContent('Knowledge Ready')
    })
    expect(draftRegion).not.toHaveTextContent(/NaN|undefined|\d+(?:\.\d+)? packs? resolved/i)
  })

  it('blocks Outcome Studio prompt and response actions when active session truth is out of date', async () => {
    const user = userEvent.setup()
    const activeSession = {
      sessionId: 'out_sess_active_fixture',
      status: 'ACTIVE',
      sourceOutputAssetId: 'out_asset_test',
      sourceOutputTypeKey: 'EXECUTIVE_BRIEF',
      sourceOutputTypeLabel: 'Executive Brief',
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
      truthSignature: {
        status: 'PROJECTED',
        currentness: 'OUT_OF_DATE',
      },
    }
    const readyOutcomeStudioPayload = {
      ...outcomeStudioPayload,
      readiness: {
        ...outcomeStudioPayload.readiness,
        state: 'READY',
        canStartSession: true,
        canReason: false,
        blockers: [],
        safetyGates: {
          ...outcomeStudioPayload.readiness.safetyGates,
          passedCount: 4,
          blockedCount: 1,
        },
      },
      truthBinding: {
        ...outcomeStudioPayload.truthBinding,
        truthSignature: {
          ...outcomeStudioPayload.truthBinding.truthSignature,
          currentness: 'OUT_OF_DATE',
        },
      },
      safetyGates: buildReadyOutcomeStudioSafetyGates(),
      packBinding: {
        ...outcomeStudioPayload.packBinding,
        status: 'BOUND',
        activePacks: outcomeStudioPayload.packBinding.requiredPacks.map((pack) => ({
          ...pack,
          status: 'ACTIVE',
          runtimeBindable: true,
        })),
        requiredPacks: outcomeStudioPayload.packBinding.requiredPacks.map((pack) => ({
          ...pack,
          status: 'ACTIVE',
          runtimeBindable: true,
        })),
      },
      conversation: {
        ...outcomeStudioPayload.conversation,
        enabled: true,
        disabledReason: '',
      },
      sessions: [activeSession],
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload.readiness },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...activeSession,
          messages: [
            {
              messageId: 'out_msg_existing_fixture',
              sessionId: 'out_sess_active_fixture',
              role: 'USER',
              status: 'SUBMITTED',
              responseStatus: 'PENDING_RESPONSE',
              prompt: 'Existing governed prompt.',
              submittedAt: '2026-06-15T08:24:00.000Z',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudioSession,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /conversation/i }))

    const history = within(main).getByRole('list', { name: /outcome studio prompt history/i })
    expect(history).toHaveTextContent('Existing governed prompt.')
    expect(history).toHaveTextContent('Response generation is blocked until the session truth signature is current.')
    const generateResponseButton = within(history).getByRole('button', { name: /generate response/i })
    expect(generateResponseButton).toBeDisabled()
    expect(generateResponseButton).toHaveAccessibleDescription(
      'Response generation is blocked until the session truth signature is current.',
    )

    const promptInput = within(main).getByRole('textbox', { name: /prompt/i })
    const submitButton = within(main).getByRole('button', { name: /submit prompt/i })
    expect(promptInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveAccessibleDescription(
      'Prompt submission is blocked until the session truth signature is current.',
    )
    expect(within(main).getAllByText('Prompt submission is blocked until the session truth signature is current.')).toHaveLength(2)

    await user.click(submitButton)
    expect(submitRuntimeOutcomeMessage).not.toHaveBeenCalled()
    await user.click(generateResponseButton)
    expect(generateRuntimeOutcomeResponse).not.toHaveBeenCalled()
  })

  it('enables Outcome Studio update from latest truth for an out-of-date active session', async () => {
    const user = userEvent.setup()
    const activeSession = {
      sessionId: 'out_sess_active_fixture',
      status: 'ACTIVE',
      sourceOutputAssetId: 'out_asset_test',
      sourceOutputTypeKey: 'EXECUTIVE_BRIEF',
      sourceOutputTypeLabel: 'Executive Brief',
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
      truthSignature: {
        truthSignatureId: 'truth_sig_existing_fixture',
        status: 'PROJECTED',
        currentness: 'OUT_OF_DATE',
      },
    }
    const readyOutcomeStudioPayload = {
      ...outcomeStudioPayload,
      readiness: {
        ...outcomeStudioPayload.readiness,
        state: 'READY',
        canStartSession: true,
        blockers: [],
      },
      truthBinding: {
        ...outcomeStudioPayload.truthBinding,
        truthSignature: {
          ...outcomeStudioPayload.truthBinding.truthSignature,
          currentness: 'OUT_OF_DATE',
        },
      },
      sessions: [activeSession],
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: readyOutcomeStudioPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...activeSession,
          messages: [],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudioSession,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /truth binding/i }))
    const truthBinding = within(main).getByRole('region', { name: /outcome studio truth binding/i })
    const truthUpdateButton = within(truthBinding).getByRole('button', { name: /update from latest truth/i })

    expect(truthUpdateButton).toBeEnabled()
    expect(truthUpdateButton).toHaveAccessibleDescription(
      'Update from latest truth is available for this out-of-date session.',
    )

    await user.click(truthUpdateButton)

    await waitFor(() => {
      expect(updateRuntimeOutcomeSessionFromLatestTruth).toHaveBeenCalledWith({
        runtimeInstanceId: 'value-narrative-001',
        sessionId: 'out_sess_active_fixture',
        body: {},
      })
    })
    expect(await within(main).findByText('Outcome Studio truth binding updated.')).toBeInTheDocument()
    expect(refetchOutcomeStudioSession).toHaveBeenCalled()
    expect(refetchOutcomeStudio).toHaveBeenCalled()
  })

  it('surfaces Outcome Studio update-from-latest-truth failures without enabling prompt actions', async () => {
    const user = userEvent.setup()
    unwrapUpdateRuntimeOutcomeSessionFromLatestTruth.mockRejectedValueOnce({
      status: 500,
      data: {
        error: {
          code: 'OUTCOME_TRUTH_UPDATE_AUDIT_FAILED',
          message: 'Outcome Studio truth update audit could not be persisted.',
          requestId: 'req-truth-update',
        },
      },
    })
    const activeSession = {
      sessionId: 'out_sess_active_fixture',
      status: 'ACTIVE',
      sourceOutputAssetId: 'out_asset_test',
      sourceOutputTypeKey: 'EXECUTIVE_BRIEF',
      sourceOutputTypeLabel: 'Executive Brief',
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
      truthSignature: {
        truthSignatureId: 'truth_sig_existing_fixture',
        status: 'PROJECTED',
        currentness: 'OUT_OF_DATE',
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...outcomeStudioPayload,
          readiness: {
            ...outcomeStudioPayload.readiness,
            state: 'READY',
            canStartSession: true,
            blockers: [],
          },
          truthBinding: {
            ...outcomeStudioPayload.truthBinding,
            truthSignature: {
              ...outcomeStudioPayload.truthBinding.truthSignature,
              currentness: 'OUT_OF_DATE',
            },
          },
          sessions: [activeSession],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...activeSession,
          messages: [],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudioSession,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /truth binding/i }))
    await user.click(within(main).getByRole('button', { name: /update from latest truth/i }))

    expect(await within(main).findByText(/Outcome Studio truth update audit could not be persisted/)).toBeInTheDocument()
    expect(refetchOutcomeStudioSession).not.toHaveBeenCalled()
    expect(refetchOutcomeStudio).not.toHaveBeenCalled()

    await user.click(within(main).getByRole('tab', { name: /conversation/i }))
    const promptInput = within(main).getByRole('textbox', { name: /prompt/i })
    const submitButton = within(main).getByRole('button', { name: /submit prompt/i })
    expect(promptInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('renders Outcome Studio asset metadata without exposing generated content or export controls', async () => {
    const user = userEvent.setup()
    const outcomeAsset = {
      outcomeAssetId: 'outcome_asset_existing_fixture',
      title: 'Governed Board Narrative',
      outputTypeKey: 'BOARD_NARRATIVE',
      outputTypeLabel: 'Board Narrative',
      status: 'GENERATED',
      currentVersionNumber: 2,
      generatedAt: '2026-06-15T08:32:00.000Z',
      truthSignature: {
        status: 'BOUND',
        currentness: 'CURRENT',
        hiddenInternals: 'Raw outcome asset truth internals must not render.',
      },
      knowledgePackBinding: {
        status: 'READY_WITH_GAPS',
        resolvedCount: 7,
        resolution: {
          status: 'READY_WITH_GAPS',
          resolvedCount: 7,
          requestedOutputTypeKey: 'board_narrative',
        },
        activePacks: [
          {
            packKey: 'arl-core',
            sourceBundle: 'Raw outcome asset pack source must not render.',
          },
        ],
      },
      sourceOutput: {
        markdown: 'Raw outcome asset source Markdown must not render.',
      },
      customerContent: {
        markdown: 'Raw outcome asset customer content must not render.',
      },
      lineageSummary: {
        parentVersionId: 'outcome_asset_version_previous_fixture',
        grrExecutionId: 'grr_exec_runtime_generation_fixture',
        grrRuntimeArtifactId: 'grr_art_runtime_generation_fixture',
        grrProviderMode: 'DETERMINISTIC_TEST',
        grrRuntimeStateWrites: {
          status: 'NOT_WRITTEN',
          reason: 'NO_REVIEWED_GRR_RUNTIME_PATH_V1',
        },
        grrCertification: {
          runtimeArtifactIsCertifiedTruth: false,
        },
        promptAssembly: 'Raw outcome asset prompt assembly must not render.',
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...outcomeStudioPayload,
          assets: [outcomeAsset],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /assets/i }))
    const assetPanel = within(main).getByRole('region', { name: /outcome studio assets/i })
    const assetList = within(assetPanel).getByRole('list', { name: /outcome studio outcome assets/i })

    expect(assetList).toHaveTextContent('Governed Board Narrative')
    expect(assetList).toHaveTextContent('Board Narrative')
    expect(assetList).toHaveTextContent('Generated')
    expect(assetList).toHaveTextContent('Version 2')
    expect(assetList).toHaveTextContent('Parent outcome_asse..._fixture')
    expect(assetList).toHaveTextContent('Truth Current')
    expect(assetList).toHaveTextContent('Knowledge Ready with optional gaps / 7 packs resolved')
    expect(assetList).not.toHaveTextContent(/Packs \d+\/\d+/i)
    expect(assetList).toHaveTextContent(/GRR grr_exec_run.*Artefact grr_art_run.*Provider Deterministic Test/)
    expect(assetList).toHaveTextContent('Runtime State Not Written / No Reviewed Grr Runtime Path V1 / Certified Truth No')
    expect(within(assetPanel).queryByRole('button', { name: /^markdown$/i })).not.toBeInTheDocument()
    expect(within(assetPanel).queryByRole('button', { name: /^json$/i })).not.toBeInTheDocument()
    expect(within(assetPanel).queryByRole('button', { name: /^docx$/i })).not.toBeInTheDocument()
    expect(within(assetPanel).queryByRole('button', { name: /^pdf$/i })).not.toBeInTheDocument()
    const publishButton = within(assetPanel).getByRole('button', { name: /^publish$/i })
    expect(publishButton).toBeDisabled()
    const publishReason = document.getElementById(publishButton.getAttribute('aria-describedby'))
    expect(publishReason).toHaveTextContent('Publish is blocked until a persisted current version is available.')
    expect(exportRuntimeOutcomeAsset).not.toHaveBeenCalled()
    expect(screen.queryByText('Raw outcome asset truth internals must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw outcome asset pack source must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw outcome asset source Markdown must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw outcome asset customer content must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw outcome asset prompt assembly must not render.')).not.toBeInTheDocument()
  })

  it('downloads governed Outcome Studio Markdown exports from persisted current versions', async () => {
    const user = userEvent.setup()
    const outcomeAsset = {
      outcomeAssetId: 'outcome_asset_existing_fixture',
      title: 'Governed Board Narrative',
      outputTypeKey: 'BOARD_NARRATIVE',
      outputTypeLabel: 'Board Narrative',
      status: 'GENERATED',
      currentVersionId: 'outcome_asset_version_existing_fixture',
      currentVersionNumber: 2,
      generatedAt: '2026-06-15T08:32:00.000Z',
      truthSignature: {
        status: 'BOUND',
        currentness: 'CURRENT',
      },
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
        activePacks: [
          {
            packKey: 'arl-core',
            sourceBundle: 'Raw outcome asset pack source must not render.',
          },
        ],
      },
      customerContent: {
        markdown: 'Raw outcome asset customer content must not render.',
      },
      lineageSummary: {
        parentVersionId: 'outcome_asset_version_previous_fixture',
        promptAssembly: 'Raw outcome asset prompt assembly must not render.',
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...outcomeStudioPayload,
          assets: [outcomeAsset],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /assets/i }))
    const assetPanel = within(main).getByRole('region', { name: /outcome studio assets/i })

    await user.click(within(assetPanel).getByRole('button', { name: /^markdown$/i }))

    expect(exportRuntimeOutcomeAsset).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      outcomeAssetId: 'outcome_asset_existing_fixture',
      format: 'MARKDOWN',
    })
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    const publishButton = within(assetPanel).getByRole('button', { name: /^publish$/i })
    expect(publishButton).toBeEnabled()
    await user.click(publishButton)
    expect(publishRuntimeOutcomeAsset).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      outcomeAssetId: 'outcome_asset_existing_fixture',
      body: {},
    })
    await within(main).findByText('Outcome Studio asset published.')
    expect(refetchOutcomeStudio).toHaveBeenCalled()
    const docxButton = within(assetPanel).getByRole('button', { name: /^docx$/i })
    const pdfButton = within(assetPanel).getByRole('button', { name: /^pdf$/i })
    expect(docxButton).toBeEnabled()
    expect(pdfButton).toBeEnabled()
    expect(assetPanel).not.toHaveTextContent(/safe rendering and QA pipeline/i)
    unwrapExportRuntimeOutcomeAsset.mockResolvedValueOnce({
      data: {
        format: 'PDF',
        filename: 'value-narrative-001-governed-board-narrative.pdf',
        mimeType: 'application/pdf',
        encoding: 'base64',
        contentBase64: 'JVBERi0xLjQ=',
      },
    })
    await user.click(pdfButton)
    expect(exportRuntimeOutcomeAsset).toHaveBeenLastCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      outcomeAssetId: 'outcome_asset_existing_fixture',
      format: 'PDF',
    })
    expect(exportRuntimeOutcomeAsset).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Raw outcome asset customer content must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw outcome asset pack source must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw outcome asset prompt assembly must not render.')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:output-lab-export')
    }, { timeout: 2000 })
  })

  it('shows a governed export failure when Outcome Studio binary export content is malformed', async () => {
    const user = userEvent.setup()
    const outcomeAsset = {
      outcomeAssetId: 'outcome_asset_existing_fixture',
      title: 'Governed Board Narrative',
      outputTypeKey: 'BOARD_NARRATIVE',
      outputTypeLabel: 'Board Narrative',
      status: 'GENERATED',
      currentVersionId: 'outcome_asset_version_existing_fixture',
      currentVersionNumber: 2,
      truthSignature: {
        status: 'BOUND',
        currentness: 'CURRENT',
      },
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...outcomeStudioPayload,
          assets: [outcomeAsset],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    unwrapExportRuntimeOutcomeAsset.mockResolvedValueOnce({
      data: {
        format: 'PDF',
        filename: 'malformed.pdf',
        mimeType: 'application/pdf',
        encoding: 'base64',
        contentBase64: 'not valid base64 %%%',
      },
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /assets/i }))
    const assetPanel = within(main).getByRole('region', { name: /outcome studio assets/i })

    await user.click(within(assetPanel).getByRole('button', { name: /^pdf$/i }))

    await screen.findByText('Outcome export failed')
    expect(screen.getByText('Export content could not be decoded.')).toBeInTheDocument()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled()
  })

  it('loads sanitized Outcome Studio asset version metadata without rendering generated content', async () => {
    const user = userEvent.setup()
    const outcomeAsset = {
      outcomeAssetId: 'outcome_asset_existing_fixture',
      title: 'Governed Board Narrative',
      outputTypeKey: 'BOARD_NARRATIVE',
      outputTypeLabel: 'Board Narrative',
      status: 'GENERATED',
      currentVersionId: 'outcome_asset_version_existing_fixture',
      currentVersionNumber: 2,
      generatedAt: '2026-06-15T08:32:00.000Z',
      truthSignature: {
        status: 'BOUND',
        currentness: 'CURRENT',
      },
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
      lineageSummary: {
        parentVersionId: 'outcome_asset_version_previous_fixture',
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...outcomeStudioPayload,
          assets: [outcomeAsset],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useLazyGetRuntimeOutcomeAssetQuery.mockReturnValue([
      getRuntimeOutcomeAssetDetail,
      {
        data: {
          data: {
            ...outcomeAsset,
            customerContent: {
              markdown: 'Raw generated customer body must not render.',
            },
            sourceOutput: {
              markdown: 'Raw source output body must not render.',
            },
            knowledgePackBinding: {
              ...outcomeAsset.knowledgePackBinding,
              activePacks: [
                {
                  packKey: 'arl-core',
                  sourceBundle: 'Raw pack source must not render.',
                },
              ],
            },
            versions: [
              {
                outcomeAssetVersionId: 'outcome_asset_version_existing_fixture',
                versionNumber: 2,
                status: 'CURRENT',
                contentAvailable: true,
                generatedAt: '2026-06-15T08:34:00.000Z',
                truthSignature: {
                  status: 'BOUND',
                  currentness: 'CURRENT',
                },
                warnings: ['Review by account owner before external use.'],
                limitations: ['No quantified ROI evidence.'],
                lineageSummary: {
                  grrExecutionId: 'grr_exec_runtime_generation_fixture',
                  grrRuntimeArtifactId: 'grr_art_runtime_generation_fixture',
                  grrProviderMode: 'DETERMINISTIC_TEST',
                  grrRuntimeStateWrites: {
                    status: 'NOT_WRITTEN',
                  },
                  grrCertification: {
                    runtimeArtifactIsCertifiedTruth: false,
                  },
                },
                customerContent: {
                  markdown: 'Raw version customer body must not render.',
                },
                promptAssembly: 'Raw prompt assembly must not render.',
              },
            ],
          },
        },
        isFetching: false,
        error: null,
      },
    ])

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /assets/i }))
    const assetPanel = within(main).getByRole('region', { name: /outcome studio assets/i })

    await user.click(within(assetPanel).getByRole('button', { name: /^view versions$/i }))

    expect(getRuntimeOutcomeAssetDetail).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      outcomeAssetId: 'outcome_asset_existing_fixture',
    })
    const versionRegion = within(assetPanel).getByRole('region', {
      name: /outcome studio asset version metadata/i,
    })
    expect(versionRegion).toHaveTextContent('Asset Version Metadata')
    expect(versionRegion).toHaveTextContent('Governed Board Narrative')
    expect(versionRegion).toHaveTextContent('1 versions')
    expect(versionRegion).toHaveTextContent('Version 2')
    expect(versionRegion).toHaveTextContent('Truth Current')
    expect(versionRegion).toHaveTextContent('Content available')
    expect(versionRegion).toHaveTextContent('Warnings 1')
    expect(versionRegion).toHaveTextContent('Limitations 1')
    expect(versionRegion).toHaveTextContent(/GRR grr_exec_run.*Artefact grr_art_run.*Provider Deterministic Test/)
    expect(versionRegion).toHaveTextContent('Runtime State Not Written / Certified Truth No')
    expect(screen.queryByText('Raw generated customer body must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw source output body must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw pack source must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw version customer body must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw prompt assembly must not render.')).not.toBeInTheDocument()
  })

  it('renders governed Outcome Studio generated body preview without using export or raw internals', async () => {
    const user = userEvent.setup()
    const outcomeAsset = {
      outcomeAssetId: 'outcome_asset_existing_fixture',
      title: 'Governed Board Narrative',
      outputTypeKey: 'BOARD_NARRATIVE',
      outputTypeLabel: 'Board Narrative',
      status: 'GENERATED',
      currentVersionId: 'outcome_asset_version_existing_fixture',
      currentVersionNumber: 2,
      generatedAt: '2026-06-15T08:32:00.000Z',
      truthSignature: {
        status: 'BOUND',
        currentness: 'CURRENT',
      },
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...outcomeStudioPayload,
          assets: [outcomeAsset],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([
      getRuntimeOutcomeAssetPreview,
      {
        data: {
          data: {
            outcomeAssetId: 'outcome_asset_existing_fixture',
            outcomeAssetVersionId: 'outcome_asset_version_existing_fixture',
            title: 'Governed Board Narrative',
            versionNumber: 2,
            status: 'CURRENT',
            previewAvailable: true,
            markdown: [
              '# Governed Board Narrative',
              '',
              'Customer-facing generated body.',
              '',
              '## Evidence Themes',
              '',
              '- Certified runtime truth only',
              '- No hidden reasoning',
              '',
              '<script>Raw preview script must not execute.</script>',
            ].join('\n'),
            sections: [
              {
                key: 'executive-narrative',
                label: 'Executive Narrative',
                body: 'Customer-facing section body.',
                hiddenReasoning: 'Raw preview section internals must not render.',
              },
            ],
            truthSignature: {
              status: 'BOUND',
              currentness: 'CURRENT',
            },
            customerContent: {
              rawInternal: 'Raw preview customer content object must not render.',
            },
            sourceOutput: {
              markdown: 'Raw preview source Markdown must not render.',
            },
            knowledgePackBinding: {
              sourceBundle: 'Raw preview pack source must not render.',
            },
            generatedAt: '2026-06-15T08:34:00.000Z',
          },
        },
        isFetching: false,
        error: null,
      },
    ])

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /assets/i }))
    const assetPanel = within(main).getByRole('region', { name: /outcome studio assets/i })

    await user.click(within(assetPanel).getByRole('button', { name: /^view versions$/i }))

    expect(getRuntimeOutcomeAssetPreview).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      outcomeAssetId: 'outcome_asset_existing_fixture',
    })
    expect(exportRuntimeOutcomeAsset).not.toHaveBeenCalled()
    const previewRegion = within(assetPanel).getByRole('region', {
      name: /outcome studio generated body preview/i,
    })
    expect(previewRegion).toHaveTextContent('Generated Body Preview')
    expect(previewRegion).toHaveTextContent('Available')
    expect(previewRegion).toHaveTextContent('2 / Current')
    expect(within(previewRegion).getByRole('heading', { name: 'Governed Board Narrative' })).toBeInTheDocument()
    expect(previewRegion).toHaveTextContent('Customer-facing generated body.')
    expect(within(previewRegion).getByRole('heading', { name: 'Evidence Themes' })).toBeInTheDocument()
    expect(within(previewRegion).getByText('Certified runtime truth only')).toBeInTheDocument()
    expect(within(previewRegion).getByText('No hidden reasoning')).toBeInTheDocument()
    expect(previewRegion.querySelector('script')).not.toBeInTheDocument()
    expect(previewRegion).toHaveTextContent('<script>Raw preview script must not execute.</script>')
    expect(within(previewRegion).getByRole('list', { name: /outcome studio generated body sections/i }))
      .toHaveTextContent('Executive Narrative')
    expect(previewRegion).toHaveTextContent('Customer-facing section body.')
    expect(screen.queryByText('Raw preview section internals must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw preview customer content object must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw preview source Markdown must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw preview pack source must not render.')).not.toBeInTheDocument()
  })

  it('renders Outcome Studio generated body preview blockers without export attempts', async () => {
    const user = userEvent.setup()
    const outcomeAsset = {
      outcomeAssetId: 'outcome_asset_existing_fixture',
      title: 'Governed Board Narrative',
      outputTypeKey: 'BOARD_NARRATIVE',
      outputTypeLabel: 'Board Narrative',
      status: 'GENERATED',
      currentVersionId: 'outcome_asset_version_existing_fixture',
      currentVersionNumber: 2,
      generatedAt: '2026-06-15T08:32:00.000Z',
      truthSignature: {
        status: 'BOUND',
        currentness: 'CURRENT',
      },
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...outcomeStudioPayload,
          assets: [outcomeAsset],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([
      getRuntimeOutcomeAssetPreview,
      {
        data: null,
        isFetching: false,
        error: {
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'Outcome Studio asset preview requires current certified runtime truth.',
              details: {
                reason: 'OUTCOME_ASSET_PREVIEW_BLOCKED',
              },
            },
          },
        },
      },
    ])

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /assets/i }))
    const assetPanel = within(main).getByRole('region', { name: /outcome studio assets/i })

    await user.click(within(assetPanel).getByRole('button', { name: /^view versions$/i }))

    expect(getRuntimeOutcomeAssetPreview).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      outcomeAssetId: 'outcome_asset_existing_fixture',
    })
    expect(exportRuntimeOutcomeAsset).not.toHaveBeenCalled()
    const previewRegion = within(assetPanel).getByRole('region', {
      name: /outcome studio generated body preview/i,
    })
    expect(previewRegion).toHaveTextContent('Unavailable')
    expect(previewRegion).toHaveTextContent(
      'Outcome Studio asset preview requires current certified runtime truth.',
    )
  })

  it('blocks Outcome Studio exports when asset truth is out of date', async () => {
    const user = userEvent.setup()
    const outcomeAsset = {
      outcomeAssetId: 'outcome_asset_existing_fixture',
      title: 'Governed Board Narrative',
      outputTypeKey: 'BOARD_NARRATIVE',
      outputTypeLabel: 'Board Narrative',
      status: 'GENERATED',
      currentVersionId: 'outcome_asset_version_existing_fixture',
      currentVersionNumber: 2,
      generatedAt: '2026-06-15T08:32:00.000Z',
      truthSignature: {
        status: 'BOUND',
        currentness: 'OUT_OF_DATE',
      },
      knowledgePackBinding: {
        status: 'BOUND',
        activeCount: 5,
        requiredCount: 5,
      },
      lineageSummary: {
        parentVersionId: 'outcome_asset_version_previous_fixture',
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...outcomeStudioPayload,
          assets: [outcomeAsset],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutcomeStudio,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /outcome studio/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /assets/i }))
    const assetPanel = within(main).getByRole('region', { name: /outcome studio assets/i })
    const assetList = within(assetPanel).getByRole('list', { name: /outcome studio outcome assets/i })

    expect(assetList).toHaveTextContent('Truth Out Of Date')
    expect(assetList).toHaveTextContent('Export is blocked until the outcome asset truth signature is current.')
    const markdownButton = within(assetPanel).getByRole('button', { name: /^markdown$/i })
    const jsonButton = within(assetPanel).getByRole('button', { name: /^json$/i })
    expect(markdownButton).toBeDisabled()
    expect(jsonButton).toBeDisabled()
    expect(markdownButton).toHaveAccessibleDescription(
      'Export is blocked until the outcome asset truth signature is current.',
    )

    await user.click(markdownButton)
    await user.click(jsonButton)
    expect(exportRuntimeOutcomeAsset).not.toHaveBeenCalled()
  })

  it('renders Truth Quality in Output Lab without exposing raw evidence or graph payloads', async () => {
    const user = userEvent.setup()
    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /output lab/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })
    await user.click(within(main).getByRole('tab', { name: /truth quality/i }))

    const certification = within(main).getByRole('region', { name: /truth quality/i })
    expect(within(certification).getAllByText('Strategic Truth').length).toBeGreaterThanOrEqual(1)
    expect(within(certification).getByRole('progressbar', { name: /truth quality coverage/i }))
      .toHaveAttribute('value', '90')
    expect(within(certification).getByRole('list', { name: /truth quality metrics/i }))
      .toHaveTextContent('High / 8 evidence / 4 truth')
    expect(within(certification).getByText('High / 5 sources / 5 types')).toBeInTheDocument()
    expect(within(certification).getByText('Low / 0 unresolved')).toBeInTheDocument()
    expect(within(certification).getByText(/sha256:truth.*ty-graph/)).toBeInTheDocument()
    expect(within(certification).getByText('No known quality gaps')).toBeInTheDocument()
    expect(screen.queryByText('Accepted evidence support must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw graph snippet must not render.')).not.toBeInTheDocument()
    expect(screen.queryByText('Raw source label must not render.')).not.toBeInTheDocument()
  })

  it('warns and falls back when Truth Quality certification level is not in the governed contract', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      useGetRuntimeTruthQualityQuery.mockReturnValue({
        data: {
          data: {
            ...truthQualityPayload,
            certification: {
              ...truthQualityPayload.certification,
              level: 'EXPERIMENTAL_TRUTH',
              label: 'Experimental Truth',
            },
          },
        },
        isLoading: false,
        isFetching: false,
        error: null,
      })

      renderRuntimeWorkspace()
      await user.click(screen.getByRole('button', { name: /output lab/i }))
      const main = screen.getByRole('main', { name: /guided execution sections/i })
      await user.click(within(main).getByRole('tab', { name: /truth quality/i }))

      const certification = within(main).getByRole('region', { name: /truth quality/i })
      expect(within(certification).getAllByText('Experimental Truth').length).toBeGreaterThanOrEqual(1)
      expect(warnSpy).toHaveBeenCalledWith(
        'Unknown Truth Quality certification level "EXPERIMENTAL_TRUTH" received from the runtime API; using neutral status styling.',
      )
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('renders unavailable Truth Quality state without changing Output Lab generation gates', async () => {
    const user = userEvent.setup()
    useGetRuntimeTruthQualityQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /output lab/i }))
    const main = screen.getByRole('main', { name: /guided execution sections/i })

    await user.click(within(main).getByRole('tab', { name: /truth quality/i }))
    expect(within(main).getByRole('region', { name: /truth quality/i }))
      .toHaveTextContent('Truth Quality unavailable')

    await user.click(within(main).getByRole('tab', { name: /composition/i }))
    expect(within(main).getByRole('button', { name: /^generate$/i })).toBeDisabled()
  })

  it('generates governed Output Lab output and downloads Markdown exports', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutputLabQuery.mockReturnValue({
      data: {
        data: {
          ...readyOutputLabPayload,
          assets: [
            {
              outputAssetId: 'out_asset_test',
              outputTypeKey: 'EXECUTIVE_BRIEF',
              outputTypeLabel: 'Executive Brief',
              status: 'GENERATED',
              exportable: true,
              stale: false,
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchOutputLab,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /output lab/i }))

    const main = screen.getByRole('main', { name: /guided execution sections/i })
    expect(within(main).getByRole('tablist', { name: /output lab sections/i })).toBeInTheDocument()
    await user.click(within(main).getByRole('tab', { name: /composition/i }))
    await user.click(within(main).getByRole('button', { name: /^generate$/i }))

    await waitFor(() => {
      expect(createRuntimeOutputRequest).toHaveBeenCalledWith({
        runtimeInstanceId: 'value-narrative-001',
        body: { outputTypeKey: 'EXECUTIVE_BRIEF' },
      })
    })
    expect(generateRuntimeOutputRequest).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      outputRequestId: 'out_req_test',
      body: {},
    })
    expect(refetchOutputLab).toHaveBeenCalled()

    await user.click(within(main).getByRole('tab', { name: /outputs/i }))
    await user.click(within(main).getByRole('button', { name: /^markdown$/i }))

    expect(exportRuntimeOutputAsset).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      outputAssetId: 'out_asset_test',
      format: 'MARKDOWN',
    })
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:output-lab-export')
    }, { timeout: 2000 })
  })

  it('keeps generated output success visible when Output Lab refetch fails', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      refetchOutputLab.mockRejectedValueOnce(new Error('refetch timed out'))
      useGetRuntimeOutputLabQuery.mockReturnValue({
        data: { data: readyOutputLabPayload },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: refetchOutputLab,
      })

      renderRuntimeWorkspace()
      await user.click(screen.getByRole('button', { name: /output lab/i }))
      const main = screen.getByRole('main', { name: /guided execution sections/i })
      await user.click(within(main).getByRole('tab', { name: /composition/i }))
      await user.click(within(main).getByRole('button', { name: /^generate$/i }))

      expect(await screen.findByText('Output generated')).toBeInTheDocument()
      expect(screen.getByText('Governed output is ready to export.')).toBeInTheDocument()
      expect(screen.queryByText('Output failed')).not.toBeInTheDocument()
      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          'Output Lab refetch failed after successful generation.',
          expect.any(Error),
        )
      })
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('renders output assets with stable keys when generated asset ids are missing', async () => {
    const user = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      useGetRuntimeOutputLabQuery.mockReturnValue({
        data: {
          data: {
            ...readyOutputLabPayload,
            assets: [
              {
                outputAssetId: '',
                outputTypeKey: 'EXECUTIVE_BRIEF',
                outputTypeLabel: 'Executive Brief',
                status: 'GENERATED',
                exportable: true,
                stale: false,
              },
              {
                outputAssetId: '',
                outputTypeKey: 'EXECUTIVE_BRIEF',
                outputTypeLabel: 'Executive Brief',
                status: 'GENERATED',
                exportable: true,
                stale: false,
              },
            ],
          },
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: refetchOutputLab,
      })

      renderRuntimeWorkspace()
      await user.click(screen.getByRole('button', { name: /output lab/i }))
      const main = screen.getByRole('main', { name: /guided execution sections/i })
      await user.click(within(main).getByRole('tab', { name: /outputs/i }))

      const assetList = within(main).getByRole('list', { name: /generated output assets/i })
      expect(within(assetList).getAllByText('Executive Brief')).toHaveLength(2)
      expect(errorSpy.mock.calls.some((call) =>
        call.some((item) => String(item).includes('Encountered two children with the same key')),
      )).toBe(false)
    } finally {
      errorSpy.mockRestore()
    }
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
    const sourceRegistry = screen.getByRole('region', { name: /source registry/i })
    expect(sourceRegistry.closest('.runtime-workspace__section-panels'))
      .toHaveClass('runtime-workspace__section-panels--sources')
    expect(sourceRegistry).toHaveAttribute('tabindex', '0')
    const sourceRegion = screen.getByRole('region', { name: /evidence sources/i })
    expect(sourceRegion).toHaveClass('runtime-workspace__section-panel--evidence-sources')
    expect(sourceRegion).toHaveAttribute('tabindex', '0')
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

  it('blocks evidence refresh with visible required context guidance until acquisition context is complete', async () => {
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
              marketRegion: 'UK enterprise',
              websiteSources: ['https://acme.example'],
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

    const readiness = screen.getByRole('region', { name: /acquisition readiness/i })
    expect(within(readiness).getByText('Required before extraction')).toBeInTheDocument()
    expect(within(readiness).getByText('Incomplete')).toBeInTheDocument()
    expect(within(readiness).getByText(/Add Target product or offer before building evidence/i)).toBeInTheDocument()
    expect(within(readiness).getByText('Website URL')).toBeInTheDocument()
    expect(within(readiness).getByText('Company name')).toBeInTheDocument()
    expect(within(readiness).getByText('Market / region')).toBeInTheDocument()
    expect(within(readiness).getByText('Target product or offer')).toBeInTheDocument()

    const buildButton = screen.getByRole('button', { name: /build evidence pack/i })
    const reason = document.getElementById('discovery-build-disabled-reason')
    expect(buildButton).toBeDisabled()
    expect(reason).toHaveTextContent(/Add Target product or offer before building evidence/i)
    expect(buildButton).toHaveAttribute('aria-describedby', reason.id)
    fireEvent.submit(buildButton.closest('form'))
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')

    expect(within(readiness).getByText('Ready')).toBeInTheDocument()
    expect(within(readiness).getByText(/Evidence extraction is ready to run with the current context/i))
      .toBeInTheDocument()
    expect(buildButton).toBeEnabled()
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

  it('shows the nested Intelligence Hub document ingestion cause when extraction fails', async () => {
    const user = userEvent.setup()
    unwrapDiscoveryInputs.mockRejectedValueOnce({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Document ingestion could not produce governed evidence.',
          requestId: 'mq8bynyv-6vtfi3',
          details: {
            reason: 'DOCUMENT_INGESTION_FAILED',
            acquisitionProfile: 'STANDARD',
            acquisitionStatus: 'FAILED',
            acquisitionError: 'Uploaded document customer-brief.pdf did not produce reviewable evidence.',
          },
        },
      },
    })
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
    const discoveryDocument = new File(
      ['%PDF-1.7 unreadable deployment fixture'],
      'customer-brief.pdf',
      { type: 'application/pdf' },
    )

    await user.upload(within(discoveryDocuments).getByLabelText('Document Sources'), discoveryDocument)
    expect(await within(discoveryDocuments).findByText('customer-brief.pdf')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Website Source 1'), 'https://acme.example')
    await user.type(screen.getByLabelText('Market / Region'), 'UK enterprise')
    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')
    await user.click(within(discoveryDocuments).getByRole('button', { name: /extract intelligence hub document evidence/i }))

    expect(updateRuntimeDiscoveryInputs).toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(await screen.findByText(
      /Uploaded document customer-brief\.pdf did not produce reviewable evidence\. Reference: mq8bynyv-6vtfi3/i,
    )).toBeInTheDocument()
    expect(screen.queryByText(/Document ingestion could not produce governed evidence\. \(Ref: mq8bynyv-6vtfi3\)/i))
      .not.toBeInTheDocument()
    expect(within(discoveryDocuments).getByText('customer-brief.pdf')).toBeInTheDocument()
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
              readiness: {
                state: 'NOT_READY',
                coveragePercent: 40,
                acceptedEvidenceCount: 0,
                pendingReviewCount: 5,
                contradictionCount: 0,
                blockerReasons: ['NO_ACCEPTED_EVIDENCE'],
                warningReasons: ['EVIDENCE_REVIEW_PENDING'],
              },
              signalCandidates: [
                {
                  signalId: 'signal-company',
                  domain: 'Company',
                  signalStrength: 'MODERATE',
                  evidenceObjectCount: 2,
                  acceptedEvidenceCount: 0,
                  pendingReviewCount: 2,
                  sourceCount: 2,
                },
              ],
            },
            acquisitionEffectiveness: {
              profile: 'STANDARD',
              label: 'Standard Acquisition',
              summary: 'Good for quick discovery.',
              qualityLabel: 'Developing',
              minimumRecommendedInputs: [
                'Website URL',
                'Company name',
                'Product / offer',
                'Notes or document',
              ],
              additionalUsefulInputs: ['Market / region', 'Uploaded document'],
              missingRecommendedInputs: ['Customer proof'],
              recommendedNextInput: 'Add Customer proof.',
              metrics: {
                sourceCount: 5,
                evidenceObjectCount: 5,
                coveragePercent: 40,
                confidence: 'STANDARD',
                readinessState: 'NOT_READY',
              },
              missingDomains: ['Proof', 'Economics'],
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

    selectIntelligenceHubTab('Context')
    const profileGuidance = screen.getByRole('region', { name: /acquisition profile guidance/i })
    expect(within(profileGuidance).getByText(/Good for quick discovery/i)).toBeInTheDocument()
    expect(within(profileGuidance).getByText(/Website URL, Company name, Product \/ offer, Notes or document/i))
      .toBeInTheDocument()
    expect(within(profileGuidance).getByText(/Market \/ region, Uploaded document/i)).toBeInTheDocument()

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
    const acquisitionQuality = screen.getByRole('region', { name: /acquisition quality/i })
    expect(within(acquisitionQuality).getByText(/Standard Acquisition effectiveness/i)).toBeInTheDocument()
    expect(within(acquisitionQuality).getByText(/Developing acquisition quality/i)).toBeInTheDocument()
    expect(within(acquisitionQuality).getByText(/5 sources \/ 5 evidence objects \/ Standard confidence/i))
      .toBeInTheDocument()
    expect(within(acquisitionQuality).getByText(/Recommended next input: Add Customer proof/i))
      .toBeInTheDocument()
    const discoveryReadiness = screen.getByRole('region', { name: /discovery readiness/i })
    expect(within(discoveryReadiness).getByText(/Not Ready/i)).toBeInTheDocument()
    expect(within(discoveryReadiness).getByText(/Blocked by No Accepted Evidence/i)).toBeInTheDocument()
    expect(within(discoveryReadiness).getByText(/0 accepted \/ 5 pending evidence objects/i)).toBeInTheDocument()
    expect(within(discoveryReadiness).getByText(/No contradiction candidates projected/i)).toBeInTheDocument()
    const signalCandidates = screen.getByRole('region', { name: /signal candidates/i })
    expect(within(signalCandidates).getByText('Company')).toBeInTheDocument()
    expect(within(signalCandidates).getByText(/Moderate signal: 2 evidence objects, 0 accepted, 2 pending, 2 sources/i))
      .toBeInTheDocument()
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
    expect(within(coverageHeatmap).getByRole('heading', { name: 'Accepted Coverage Heatmap' })).toBeInTheDocument()
    expect(within(coverageHeatmap).getByText(
      '11 extracted evidence objects are pending review. Review and accept evidence to reveal the accepted coverage heatmap.',
    )).toBeInTheDocument()
    expect(within(coverageHeatmap).getByText('Company')).toBeInTheDocument()
    expect(within(coverageHeatmap).getByText('Industries')).toBeInTheDocument()
    expect(within(coverageHeatmap).getByLabelText(/Company coverage status: Strong accepted evidence coverage/i))
      .toBeInTheDocument()
    expect(within(coverageHeatmap).getByLabelText(/Economics coverage status: No accepted evidence coverage/i))
      .toBeInTheDocument()
    const heatGrid = within(coverageHeatmap).getByRole('region', { name: /accepted coverage heat grid/i })
    expect(within(heatGrid).getByText('67%')).toBeInTheDocument()
    expect(within(heatGrid).getByText('2 accepted of 3 evidence objects')).toBeInTheDocument()
    expect(within(heatGrid).getByText('50%')).toBeInTheDocument()
    expect(within(heatGrid).getByText('1 accepted of 2 evidence objects')).toBeInTheDocument()
    expect(within(heatGrid).getByRole('list', { name: /accepted coverage heat grid legend/i }))
      .toBeInTheDocument()
    expect(within(coverageHeatmap).getByLabelText(/Products coverage status: Adequate accepted evidence coverage/i))
      .toBeInTheDocument()

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

  it('hides accepted coverage progress until evidence has been accepted', () => {
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
            evidenceObjectSummary: {
              evidenceObjectCount: 4,
              acceptedEvidenceCount: 0,
              pendingReviewCount: 4,
              rejectedEvidenceCount: 0,
            },
            discoveryHealth: {
              coveragePercent: 50,
              confidence: 'SOURCE_BACKED',
              missingAreas: ['PROOF'],
              coverageAreas: [
                {
                  area: 'Company',
                  state: 'WEAK',
                  evidenceCount: 3,
                  acceptedEvidenceCount: 0,
                },
                {
                  area: 'Services',
                  state: 'WEAK',
                  evidenceCount: 1,
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

    const coverageHeatmap = screen.getByRole('region', { name: /accepted coverage heatmap/i })
    expect(within(coverageHeatmap).getByText(
      '4 extracted evidence objects are pending review. Review and accept evidence to reveal the accepted coverage heatmap.',
    )).toBeInTheDocument()
    expect(within(coverageHeatmap).queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(coverageHeatmap).queryByText('Company')).not.toBeInTheDocument()
    expect(within(coverageHeatmap).queryByText(/Coverage 50%/i)).not.toBeInTheDocument()
  })

  it('renders Intelligence Graph summaries without exposing raw graph internals', async () => {
    useGetRuntimeIntelligenceGraphQuery.mockReturnValue({
      data: {
        data: {
          available: true,
          graphVersion: '2.2',
          nodes: [
            {
              nodeId: 'source-node-id-should-not-render',
              nodeType: 'SOURCE',
              entityDisplayName: 'Source',
              label: 'Raw source label should not render',
              textContent: 'raw source graph text should not render',
            },
            {
              nodeId: 'evidence-node-id-should-not-render',
              nodeType: 'EVIDENCE',
              entityDisplayName: 'Evidence',
              label: 'Raw evidence label should not render',
              textContent: 'raw graph text should not render',
            },
            {
              nodeId: 'section-truth-node-id-should-not-render',
              nodeType: 'SECTION_TRUTH',
              entityDisplayName: 'Section Truth',
              label: 'Customer Problem Accepted Truth',
              sectionKey: 'customer_problem',
            },
          ],
          edges: [
            {
              edgeId: 'edge-1',
              edgeType: 'SOURCE_PRODUCES_EVIDENCE',
              relationshipDisplayName: 'Source Produces Evidence',
              fromNodeId: 'source-node-id-should-not-render',
              toNodeId: 'evidence-node-id-should-not-render',
              customerVisible: true,
            },
            {
              edgeId: 'edge-2',
              edgeType: 'INTELLIGENCE_SUPPORTS_SECTION_TRUTH',
              relationshipDisplayName: 'Intelligence Supports Section Truth',
              fromNodeId: 'evidence-node-id-should-not-render',
              toNodeId: 'section-truth-node-id-should-not-render',
              customerVisible: true,
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            ...rendererPayload.discovery,
            intelligenceGraph: {
              available: true,
              graphVersion: '2.1',
              graphHash: 'sha256:graph-hash',
              build: {
                status: 'VALID',
                trigger: 'EXPLICIT_REBUILD',
                builtAt: '2026-06-05T10:00:00.000Z',
                nodeCount: 12,
                edgeCount: 14,
                sourceHash: 'sha256:source-hash',
              },
              health: {
                state: 'WARNING',
                acceptedEvidenceCount: 3,
                orphanEvidenceCount: 1,
                lowQualityEvidenceCount: 0,
                unclassifiedEvidenceCount: 1,
                missingDomainCount: 8,
                dependencyCount: 1,
                contradictionCount: 0,
              },
              coverage: {
                coverageModel: 'EVIDENCE_DOMAIN_COVERAGE',
                coveragePercent: 20,
                coveredDomainCount: 2,
                totalDomainCount: 10,
                missingDomains: ['Proof', 'Economics'],
                domains: [
                  {
                    domain: 'Company',
                    state: 'ADEQUATE',
                    acceptedEvidenceCount: 1,
                    connectedEvidenceCount: 1,
                    pendingEvidenceCount: 0,
                    rejectedEvidenceCount: 0,
                    lowQualityEvidenceCount: 0,
                  },
                  {
                    domain: 'Economics',
                    state: 'MISSING',
                    acceptedEvidenceCount: 0,
                    connectedEvidenceCount: 0,
                    pendingEvidenceCount: 0,
                    rejectedEvidenceCount: 0,
                    lowQualityEvidenceCount: 0,
                  },
                ],
              },
              dependencies: {
                sectionDependencyCount: 1,
                missingDependencyTruthCount: 0,
                sections: [
                  {
                    sectionKey: 'value_drivers',
                    dependencySectionKeys: ['customer_problem'],
                    missingDependencyTruthKeys: [],
                  },
                ],
              },
              missingAreas: ['Proof', 'Economics'],
              quality: {
                orphanEvidenceCount: 1,
                lowQualityEvidenceCount: 0,
                unclassifiedEvidenceCount: 1,
              },
              nodes: [
                {
                  nodeId: 'raw-node-id-should-not-render',
                  textContent: 'raw graph text should not render',
                },
              ],
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

    selectIntelligenceHubTab('Coverage')
    await waitFor(() => {
      expect(useGetRuntimeIntelligenceGraphQuery).toHaveBeenLastCalledWith(
        { runtimeInstanceId: 'value-narrative-001' },
        { skip: false },
      )
    })
    const runtimeGraph = await screen.findByRole('region', { name: /runtime intelligence graph/i })
    expect(within(runtimeGraph).getByText(/3 graph nodes \/ 2 graph relationships/i)).toBeInTheDocument()
    expect(within(runtimeGraph).getByText('Source')).toBeInTheDocument()
    expect(within(runtimeGraph).getByText('Evidence')).toBeInTheDocument()
    expect(within(runtimeGraph).getByText('Customer Problem Accepted Truth')).toBeInTheDocument()
    expect(within(runtimeGraph).getByText('Source Produces Evidence')).toBeInTheDocument()
    expect(within(runtimeGraph).getByText('Intelligence Supports Section Truth')).toBeInTheDocument()
    expect(runtimeGraph).toHaveClass('runtime-workspace__coverage-tab-panel--graph')

    const graphHealth = screen.getByRole('region', { name: /intelligence graph health/i })
    expect(within(graphHealth).getByText(/Graph Warning/i)).toBeInTheDocument()
    expect(within(graphHealth).getByText(/12 nodes \/ 14 relationships/i)).toBeInTheDocument()
    expect(within(graphHealth).getByText(/1 orphan, 0 low quality, 1 unclassified/i)).toBeInTheDocument()
    expect(within(graphHealth).getByText(/Domain coverage 20%/i)).toBeInTheDocument()

    const domainCoverage = screen.getByRole('region', { name: 'Evidence domain coverage' })
    const coverageLayout = domainCoverage.closest('.runtime-workspace__coverage-tab-layout')
    expect(coverageLayout).toBeInTheDocument()
    expect(coverageLayout.firstElementChild).toBe(domainCoverage)
    expect(within(domainCoverage).getByText('Company')).toBeInTheDocument()
    expect(within(domainCoverage).getByLabelText(/Company graph coverage status: Adequate accepted evidence coverage/i))
      .toBeInTheDocument()
    expect(within(domainCoverage).getByRole('region', { name: /evidence domain coverage heat grid/i }))
      .toBeInTheDocument()

    selectIntelligenceHubTab('Governance')
    const graphDependencies = screen.getByRole('region', { name: /intelligence graph dependencies/i })
    expect(within(graphDependencies).getByText(/1 section dependency/i)).toBeInTheDocument()
    expect(within(graphDependencies).getByText(/No missing dependency truth is projected/i)).toBeInTheDocument()

    const graphMissingAreas = screen.getByRole('region', { name: /intelligence graph missing areas/i })
    expect(within(graphMissingAreas).getByText(/Proof, Economics/i)).toBeInTheDocument()
    expect(screen.queryByText(/raw-node-id-should-not-render/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/raw graph text should not render/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/source-node-id-should-not-render/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/evidence-node-id-should-not-render/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Raw source label should not render/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Raw evidence label should not render/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/raw source graph text should not render/i)).not.toBeInTheDocument()
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
              {
                sourceId: 'website_acme',
                sourceType: 'WEBSITE',
                label: 'Website Source',
                acquisitionStatus: 'ACQUIRED',
                evidenceProduced: 8,
                url: 'https://acme.example/product',
              },
              {
                sourceId: 'document_strategy',
                sourceType: 'UPLOADED_DOCUMENT',
                fileName: 'strategy-notes.pdf',
                documentStatus: 'EXTRACTED',
                evidenceProduced: 1,
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
                evidenceObjectId: 'evidence_website_fixture',
                sourceId: 'website_acme',
                category: 'Services',
                coverageArea: 'Services',
                extractedFact: 'Website heading: Advisory services for delivery pressure.',
                reviewStatus: 'PENDING',
              },
              {
                evidenceObjectId: 'evidence_document_fixture',
                sourceId: 'document_strategy',
                category: 'Proof',
                coverageArea: 'Proof',
                extractedFact: 'Document finding: Customer proof is available.',
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
    expect(within(evidenceSources).getByText('Website heading: Advisory services for delivery pressure.'))
      .toBeInTheDocument()
    expect(within(evidenceSources).getByText('Services / https://acme.example/product')).toBeInTheDocument()
    expect(within(evidenceSources).queryByText(/Services \/ website_acme/i)).not.toBeInTheDocument()
    expect(within(evidenceSources).getByText('Document finding: Customer proof is available.')).toBeInTheDocument()
    expect(within(evidenceSources).getByText('Proof / strategy-notes.pdf')).toBeInTheDocument()
    expect(within(evidenceSources).getByText('Intelligence Hub note: governed narrative generation is required.'))
      .toBeInTheDocument()
    expect(within(evidenceSources).queryByText(/Discovery note/i)).not.toBeInTheDocument()
    expect(within(evidenceSources).getByText('Website')).toBeInTheDocument()
    expect(within(evidenceSources).getByText('Document')).toBeInTheDocument()
    expect(within(evidenceSources).getAllByText('Input').length).toBeGreaterThan(0)

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

    const lifecycleReasons = screen.getAllByText(/runtime lifecycle truth is approved, published, or locked/i)
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
    expect(refreshButton).toBeDisabled()
    await user.type(screen.getByLabelText('Website Source 1'), 'https://acme.example')
    await user.type(screen.getByLabelText('Company Name'), 'Acme')
    await user.type(screen.getByLabelText('Market / Region'), 'UK enterprise')
    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')
    expect(refreshButton).toBeEnabled()
    await user.click(refreshButton)

    expect(updateRuntimeDiscoveryInputs).toHaveBeenCalledWith(expect.objectContaining({
      runtimeInstanceId: 'value-narrative-001',
      body: expect.objectContaining({
        acquisitionProfile: 'STANDARD',
        inputs: expect.objectContaining({
          companyWebsite: 'https://acme.example',
          companyName: 'Acme',
          marketRegion: 'UK enterprise',
          targetOffer: 'Managed proposal platform',
          websiteSources: ['https://acme.example'],
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
      [new Uint8Array(3_000_000).fill(65)],
      'section-notes.pptx',
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    )
    expect(sectionDocument.size).toBeGreaterThan(2500000)

    const sectionFileInput = within(sectionEvidenceRegion).getByLabelText('Supporting Files')
    await user.upload(sectionFileInput, sectionDocument)
    expect(await within(sectionEvidenceRegion).findByText('section-notes.pptx')).toBeInTheDocument()
    expect(sectionFileInput).toBeDisabled()
    const selectedSectionDocuments = within(sectionEvidenceRegion).getByRole('list', {
      name: /selected section supporting files/i,
    })
    expect(within(selectedSectionDocuments).getByText(/staged for extraction/i)).toBeInTheDocument()
    expect(within(selectedSectionDocuments).getByText('Ready to extract')).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).queryByText(/^select files$/i)).not.toBeInTheDocument()

    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^cancel$/i }))
    expect(within(sectionEvidenceRegion).queryByText('section-notes.pptx')).not.toBeInTheDocument()
    expect(within(sectionEvidenceRegion).queryByRole('button', { name: /^extract evidence$/i })).not.toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText(/^select files$/i)).toBeInTheDocument()
    expect(sectionFileInput).not.toBeDisabled()

    await user.upload(sectionFileInput, sectionDocument)
    expect(await within(sectionEvidenceRegion).findByText('section-notes.pptx')).toBeInTheDocument()
    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i }))

    expect(updateRuntimeSectionEvidence).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        documentSources: [
          expect.objectContaining({
            fileName: 'section-notes.pptx',
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            assetType: 'SECTION_SUPPORTING_FILE',
            sizeBytes: sectionDocument.size,
            contentBase64: expect.stringMatching(
              /^data:application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation;base64,/,
            ),
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

  it('shows readable PDF extraction guidance for section supporting file ingestion failures', async () => {
    const user = userEvent.setup()
    unwrapUpdateRuntimeSectionEvidence.mockRejectedValueOnce({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Section supporting file ingestion failed.',
          requestId: 'mq1148a1-y2xvd8',
          details: {
            runtimePath: 'framework_state.sections.customer_problem',
            sectionKey: 'customer_problem',
            ingestionError: {
              name: 'Error',
              message: 'PDF document did not contain readable extractable text. Scanned, image-only, or text-map-free PDFs require OCR and are not supported yet.',
            },
          },
        },
      },
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    const pdfDocument = new File(
      ['%PDF-1.7 unreadable test content'],
      'scanned-brief.pdf',
      { type: 'application/pdf' },
    )

    await user.upload(within(sectionEvidenceRegion).getByLabelText('Supporting Files'), pdfDocument)
    expect(await within(sectionEvidenceRegion).findByText('scanned-brief.pdf')).toBeInTheDocument()

    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i }))

    expect(updateRuntimeSectionEvidence).toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(await screen.findByText(
      /this PDF has no readable text layer\. use an OCR\/searchable PDF, PPTX, DOCX, TXT, MD, or CSV\. Reference: mq1148a1-y2xvd8/i,
    )).toBeInTheDocument()
    expect(screen.queryByText(/Section supporting file ingestion failed\. \(Ref: mq1148a1-y2xvd8\)/i)).not.toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText('scanned-brief.pdf')).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i })).toBeInTheDocument()
  })

  it('shows readable PowerPoint extraction guidance for section supporting file ingestion failures', async () => {
    const user = userEvent.setup()
    unwrapUpdateRuntimeSectionEvidence.mockRejectedValueOnce({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Section supporting file ingestion failed.',
          requestId: 'pptx-ref-1',
          details: {
            runtimePath: 'framework_state.sections.customer_problem',
            sectionKey: 'customer_problem',
            ingestionError: {
              name: 'Error',
              message: 'PowerPoint document did not contain readable extractable slide text or speaker notes.',
            },
          },
        },
      },
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    const pptxDocument = new File(
      ['image only deck placeholder'],
      'image-only-deck.pptx',
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    )

    await user.upload(within(sectionEvidenceRegion).getByLabelText('Supporting Files'), pptxDocument)
    expect(await within(sectionEvidenceRegion).findByText('image-only-deck.pptx')).toBeInTheDocument()

    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i }))

    expect(updateRuntimeSectionEvidence).toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(await screen.findByText(
      /this PowerPoint file has no extractable slide text or speaker notes\. use a PPTX with selectable text\. Reference: pptx-ref-1/i,
    )).toBeInTheDocument()
    expect(screen.queryByText(/Section supporting file ingestion failed\. \(Ref: pptx-ref-1\)/i)).not.toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText('image-only-deck.pptx')).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i })).toBeInTheDocument()
  })

  it('shows malformed PowerPoint guidance for invalid PPTX packages', async () => {
    const user = userEvent.setup()
    unwrapUpdateRuntimeSectionEvidence.mockRejectedValueOnce({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Section supporting file ingestion failed.',
          requestId: 'pptx-malformed-ref-1',
          details: {
            runtimePath: 'framework_state.sections.customer_problem',
            sectionKey: 'customer_problem',
            ingestionError: {
              name: 'Error',
              message: 'PowerPoint file is not a valid PPTX package.',
            },
          },
        },
      },
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    const pptxDocument = new File(
      ['not actually a pptx'],
      'renamed-binary.pptx',
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    )

    await user.upload(within(sectionEvidenceRegion).getByLabelText('Supporting Files'), pptxDocument)
    expect(await within(sectionEvidenceRegion).findByText('renamed-binary.pptx')).toBeInTheDocument()

    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i }))

    expect(updateRuntimeSectionEvidence).toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(await screen.findByText(
      /we could not extract this presentation\. confirm that it is a valid PPTX file\. Reference: pptx-malformed-ref-1/i,
    )).toBeInTheDocument()
    expect(screen.queryByText(/use a PPTX with selectable text/i)).not.toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText('renamed-binary.pptx')).toBeInTheDocument()
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

  it('accepts all pending section evidence with one governed bulk action', async () => {
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
                evidenceObjectCount: 3,
                acceptedEvidenceObjectCount: 0,
                pendingEvidenceObjectCount: 2,
                rejectedEvidenceObjectCount: 1,
                documents: [
                  {
                    sectionDocumentId: 'section_document_1',
                    fileName: 'section-notes.txt',
                    status: 'PROCESSED',
                    sizeBytes: 1200,
                    evidenceObjectsGenerated: 3,
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
                  },
                  {
                    evidenceObjectId: 'section_evidence_2',
                    category: 'Services',
                    coverageArea: 'Services',
                    reviewStatus: 'PENDING',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'section-notes.txt',
                    snippet: 'Service teams automate onboarding support.',
                  },
                  {
                    evidenceObjectId: 'section_evidence_3',
                    category: 'Proof',
                    coverageArea: 'Proof',
                    reviewStatus: 'REJECTED',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'section-notes.txt',
                    snippet: 'Rejected evidence remains rejected.',
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
    expect(within(sectionEvidenceRegion).getByText('3 evidence objects: 0 accepted, 2 pending, 1 rejected')).toBeInTheDocument()

    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^accept all$/i }))

    expect(reviewAllRuntimeSectionEvidence).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(reviewRuntimeSectionEvidence).not.toHaveBeenCalled()
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/pending section evidence accepted/i)).toBeInTheDocument()
  })

  it('disables accept all while section evidence extraction is running', async () => {
    const user = userEvent.setup()
    unwrapUpdateRuntimeSectionEvidence.mockReturnValue(new Promise(() => {}))
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
                    snippet: 'Governed proposal workflows reduce manual effort for commercial teams.',
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
    const sectionDocument = new File(
      ['Customer teams need governed workflow automation for value narratives.'],
      'new-section-notes.txt',
      { type: 'text/plain' },
    )

    await user.upload(within(sectionEvidenceRegion).getByLabelText('Supporting Files'), sectionDocument)
    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i }))

    const acceptAllButton = within(sectionEvidenceRegion).getByRole('button', { name: /^accept all$/i })
    expect(acceptAllButton).toBeDisabled()
    expect(within(sectionEvidenceRegion).getByText(
      /wait for section evidence extraction to finish before accepting evidence/i,
    )).toBeInTheDocument()

    await user.click(acceptAllButton)
    expect(reviewAllRuntimeSectionEvidence).not.toHaveBeenCalled()
  })

  it('clears persisted section evidence after explicit confirmation', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              sectionEvidence: {
                status: 'ACCEPTED',
                documentCount: 1,
                evidenceObjectCount: 1,
                acceptedEvidenceObjectCount: 1,
                pendingEvidenceObjectCount: 0,
                rejectedEvidenceObjectCount: 0,
                documents: [
                  {
                    sectionDocumentId: 'section_document_1',
                    fileName: 'old-targeting-notes.pdf',
                    status: 'PROCESSED',
                    sizeBytes: 1200,
                    evidenceObjectsGenerated: 1,
                  },
                ],
                evidenceObjects: [
                  {
                    evidenceObjectId: 'section_evidence_1',
                    category: 'Targeting',
                    coverageArea: 'Decision Context',
                    reviewStatus: 'ACCEPTED',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'old-targeting-notes.pdf',
                    snippet: 'Certified services teams support enterprise onboarding.',
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
    const clearButton = within(sectionEvidenceRegion).getByRole('button', { name: /^clear section evidence$/i })
    expect(clearButton).toHaveClass('btn--danger', 'btn--sm')
    await user.click(clearButton)

    const clearDialog = await screen.findByRole('alertdialog', { name: /clear section evidence/i })
    expect(within(clearDialog).getByText(/intelligence hub evidence is unchanged/i)).toBeInTheDocument()
    await user.click(within(clearDialog).getByRole('button', { name: /^cancel$/i }))
    expect(clearRuntimeSectionEvidence).not.toHaveBeenCalled()

    await user.click(clearButton)
    const reopenedDialog = await screen.findByRole('alertdialog', { name: /clear section evidence/i })
    await user.click(within(reopenedDialog).getByRole('button', { name: /^clear evidence$/i }))

    expect(clearRuntimeSectionEvidence).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        confirmClear: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'USER_REQUESTED_SECTION_EVIDENCE_CLEAR',
      },
    })
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    expect(updateRuntimeSectionEvidence).not.toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/section evidence cleared/i)).toBeInTheDocument()
  })

  it('keeps clear section evidence disabled while section evidence extraction is running', async () => {
    const user = userEvent.setup()
    let resolveSectionEvidenceUpload
    unwrapUpdateRuntimeSectionEvidence.mockReturnValueOnce(new Promise((resolve) => {
      resolveSectionEvidenceUpload = resolve
    }))
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              sectionEvidence: {
                status: 'ACCEPTED',
                documentCount: 1,
                evidenceObjectCount: 1,
                acceptedEvidenceObjectCount: 1,
                pendingEvidenceObjectCount: 0,
                rejectedEvidenceObjectCount: 0,
                documents: [
                  {
                    sectionDocumentId: 'section_document_1',
                    fileName: 'old-targeting-notes.pdf',
                    status: 'PROCESSED',
                    sizeBytes: 1200,
                    evidenceObjectsGenerated: 1,
                  },
                ],
                evidenceObjects: [
                  {
                    evidenceObjectId: 'section_evidence_1',
                    category: 'Targeting',
                    coverageArea: 'Decision Context',
                    reviewStatus: 'ACCEPTED',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'old-targeting-notes.pdf',
                    snippet: 'Certified services teams support enterprise onboarding.',
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
    const sectionDocument = new File(
      ['Customer teams need governed workflow automation for value narratives.'],
      'section-notes.txt',
      { type: 'text/plain' },
    )

    await user.upload(within(sectionEvidenceRegion).getByLabelText('Supporting Files'), sectionDocument)
    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i }))

    await waitFor(() => {
      expect(within(sectionEvidenceRegion).getByRole('button', { name: /^clear section evidence$/i }))
        .toBeDisabled()
    })
    expect(within(sectionEvidenceRegion).getByText(/wait for section evidence extraction to finish before clearing evidence/i))
      .toBeInTheDocument()

    resolveSectionEvidenceUpload({ data: { section: { sectionEvidence: { status: 'PENDING_REVIEW' } } } })
    await waitFor(() => expect(refetchRenderer).toHaveBeenCalled())
  })

  it('shows normalized clear section evidence errors without success refetch', async () => {
    const user = userEvent.setup()
    unwrapClearRuntimeSectionEvidence.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'There is no section evidence to clear.',
          details: {
            reason: 'RUNTIME_ACTION_NOT_AVAILABLE',
          },
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
                status: 'ACCEPTED',
                documentCount: 1,
                evidenceObjectCount: 1,
                acceptedEvidenceObjectCount: 1,
                pendingEvidenceObjectCount: 0,
                rejectedEvidenceObjectCount: 0,
                documents: [
                  {
                    sectionDocumentId: 'section_document_1',
                    fileName: 'old-targeting-notes.pdf',
                    status: 'PROCESSED',
                    sizeBytes: 1200,
                    evidenceObjectsGenerated: 1,
                  },
                ],
                evidenceObjects: [
                  {
                    evidenceObjectId: 'section_evidence_1',
                    category: 'Targeting',
                    coverageArea: 'Decision Context',
                    reviewStatus: 'ACCEPTED',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'old-targeting-notes.pdf',
                    snippet: 'Certified services teams support enterprise onboarding.',
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
    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^clear section evidence$/i }))
    const clearDialog = await screen.findByRole('alertdialog', { name: /clear section evidence/i })
    await user.click(within(clearDialog).getByRole('button', { name: /^clear evidence$/i }))

    expect(clearRuntimeSectionEvidence).toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(await screen.findByText(/there is no section evidence to clear/i)).toBeInTheDocument()
    expect(screen.queryByText(/section evidence cleared/i)).not.toBeInTheDocument()
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

  it('shows normalized accept-all section evidence errors without success refetch', async () => {
    const user = userEvent.setup()
    unwrapReviewAllRuntimeSectionEvidence.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'No pending section evidence is available to accept.',
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
    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^accept all$/i }))

    expect(reviewAllRuntimeSectionEvidence).toHaveBeenCalled()
    expect(reviewRuntimeSectionEvidence).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(await screen.findByText(/no pending section evidence is available to accept/i)).toBeInTheDocument()
    expect(screen.queryByText(/pending section evidence accepted/i)).not.toBeInTheDocument()
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
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
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
    expect(screen.getByRole('tab', { name: 'Truth' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: /^next$/i })).toBeEnabled()
    expect(mutateRuntimeState).not.toHaveBeenCalled()
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
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: /accept truth/i }))

    expect(await screen.findByText(/runtime section cannot be accepted/i)).toBeInTheDocument()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
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
    const actionGroup = screen.getByRole('group', { name: /customer problem actions/i })
    expect(actionGroup).toHaveClass('runtime-workspace__section-command-strip')
    const actionButtons = within(actionGroup).getAllByRole('button')
    expect(actionButtons[0]).toHaveAttribute('aria-label', 'Previous')
    const nextButton = screen.getByRole('button', { name: /^next$/i })
    expect(nextButton).toBeEnabled()
    expect(nextButton).toHaveClass('btn--icon-only')
    expect(nextButton).toHaveAttribute(
      'title',
      'Save unsaved additional context and continue to the next guided section.',
    )
    await user.click(nextButton)

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
    const nextButton = screen.getByRole('button', { name: /^next$/i })
    expect(nextButton).toBeEnabled()
    expect(nextButton).toHaveAttribute(
      'title',
      'Continue to the next guided section. Generated or accepted truth is already persisted.',
    )
    await user.click(nextButton)

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

  it('saves the active section before returning to the previous guided section', async () => {
    const user = userEvent.setup()
    unwrapMutation.mockResolvedValueOnce({
      data: {
        mutation: {
          runtimePath: 'framework_state.sections.value_drivers',
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
              key: 'value_drivers',
              runtimePath: 'framework_state.sections.value_drivers',
              label: 'Value Drivers',
              control: 'TEXTAREA',
              required: true,
              value: 'Existing value drivers.',
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
    await user.click(screen.getByRole('button', { name: /2 value drivers input captured/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Value Drivers', { exact: true })
    await user.clear(field)
    await user.type(field, 'Governed output should focus on repeatable commercial value.')
    const previousButton = screen.getByRole('button', { name: /^previous$/i })
    expect(previousButton).toBeEnabled()
    expect(previousButton).toHaveClass('btn--icon-only')
    expect(previousButton).toHaveAttribute(
      'title',
      'Save unsaved additional context and return to the previous guided section.',
    )
    await user.click(previousButton)

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        operation: 'WRITE',
        value: 'Governed output should focus on repeatable commercial value.',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Customer Problem' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1 customer problem draft/i })).toHaveAttribute('aria-current', 'step')
  })

  it('saves the first guided section before returning to Intelligence Hub', async () => {
    const user = userEvent.setup()
    unwrapMutation.mockResolvedValueOnce({
      data: {
        mutation: {
          runtimePath: 'framework_state.sections.customer_problem',
        },
      },
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Customer Problem', { exact: true })
    await user.clear(field)
    await user.type(field, 'First section context should save before returning.')
    await user.click(screen.getByRole('button', { name: /^previous$/i }))

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        operation: 'WRITE',
        value: 'First section context should save before returning.',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
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

    const confirmationDialog = await screen.findByRole('dialog', { name: 'Confirm Submit for Review' })
    expect(within(confirmationDialog).getByText('Governed runtime action')).toBeInTheDocument()
    expect(within(confirmationDialog).getByText('Submit this framework for review?')).toBeInTheDocument()
    expect(within(confirmationDialog).getByText('Runtime: Acme Value Narrative')).toBeInTheDocument()
    expect(window.confirm).not.toHaveBeenCalled()

    await user.click(within(confirmationDialog).getByRole('button', { name: /submit for review/i }))

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

  it('closes a pending confirmation when the renderer disables that governed action before confirm', async () => {
    const user = userEvent.setup()
    const view = renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))
    expect(await screen.findByRole('dialog', { name: 'Confirm Submit for Review' })).toBeInTheDocument()

    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              ...rendererPayload.actions[0],
              enabled: false,
              disabledReason: 'Runtime must be marked ready again before review.',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    view.rerender(runtimeWorkspaceTree())

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Confirm Submit for Review' })).not.toBeInTheDocument()
    })
    const actionScroll = screen.getByRole('region', { name: /governed runtime actions scroll region/i })
    const governedActions = within(actionScroll).getByRole('group', { name: /^governed runtime actions$/i })
    expect(within(governedActions).getByRole('button', { name: /submit for review/i })).toBeDisabled()
    expect(within(governedActions).getAllByText('Runtime must be marked ready again before review.')).not.toHaveLength(0)
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

    const confirmationDialog = await screen.findByRole('dialog', { name: 'Confirm Submit for Review' })
    expect(within(confirmationDialog).getByText('Confirm Submit for Review?')).toBeInTheDocument()
    expect(window.confirm).not.toHaveBeenCalled()

    await user.click(within(confirmationDialog).getByRole('button', { name: /submit for review/i }))

    expect(executeRuntimeAction).toHaveBeenCalled()
  })

  it('does not execute or refetch when action confirmation is cancelled', async () => {
    const user = userEvent.setup()

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    const confirmationDialog = await screen.findByRole('dialog', { name: 'Confirm Submit for Review' })
    expect(within(confirmationDialog).getByText('Submit this framework for review?')).toBeInTheDocument()
    await user.click(within(confirmationDialog).getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Confirm Submit for Review' })).not.toBeInTheDocument()
    })
    expect(window.confirm).not.toHaveBeenCalled()
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
    const confirmationDialog = await screen.findByRole('dialog', { name: 'Confirm Submit for Review' })
    await user.click(within(confirmationDialog).getByRole('button', { name: /submit for review/i }))

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
            sectionTruth: {
              state: 'SECTION_TRUTH_BLOCKED',
              publishEligible: false,
              lockEligible: false,
              requiredSectionCount: 1,
              readySectionCount: 0,
              blockingSectionCount: 1,
            },
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

    const guidedSections = screen.getByRole('main', { name: /guided execution sections/i })
    expect(within(guidedSections).getByText(/locked runtime truth is frozen for inspection/i)).toBeInTheDocument()
    expect(within(guidedSections).queryByRole('button', { name: /build evidence pack/i })).not.toBeInTheDocument()
    expect(within(guidedSections).queryByRole('button', { name: /refresh evidence pack/i })).not.toBeInTheDocument()
    expect(within(guidedSections).queryByRole('button', { name: /accept evidence/i })).not.toBeInTheDocument()
    expect(within(guidedSections).queryByRole('button', { name: /clear intelligence hub/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /customer problem locked/i })).toBeInTheDocument()
    expect(screen.getByText('Section Truth Locked')).toBeInTheDocument()

    selectIntelligenceHubTab('Context')
    expect(within(guidedSections).getByLabelText('Company Name')).toBeDisabled()
    expect(within(guidedSections).queryByRole('button', { name: /add url/i })).not.toBeInTheDocument()
    expect(within(guidedSections).queryByText('Select Files')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    const summary = screen.getByRole('list', { name: /execution workspace summary/i })
    expect(within(summary).getAllByText('Locked').length).toBeGreaterThanOrEqual(2)
    expect(within(summary).getByText('Published')).toBeInTheDocument()
    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    expect(within(guidedPanel).getByRole('heading', { name: /truth quality/i })).toBeInTheDocument()
    expect(within(guidedPanel).getAllByText('Strategic Truth').length).toBeGreaterThanOrEqual(1)
    const certifiedTruth = screen.getByRole('list', { name: /certified runtime truth/i })
    expect(within(certifiedTruth).getByText('Eligible')).toBeInTheDocument()
    expect(within(certifiedTruth).getByText('runtime-trut...34567890')).toBeInTheDocument()
    expect(within(certifiedTruth).getByText('runtime-trut...87654321')).toBeInTheDocument()
    expect(within(certifiedTruth).getByText('runtime-repl...90abcdef')).toBeInTheDocument()
    expect(screen.getAllByText('Locked Inspection Mode').length).toBeGreaterThanOrEqual(1)
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

    const actionGroup = screen.getByRole('group', { name: /customer problem actions/i })
    expect(actionGroup).toHaveClass('runtime-workspace__section-command-strip')
    const visibleReasons = within(actionGroup).getAllByText('Save context changes before generating or accepting truth.')
    expect(visibleReasons).toHaveLength(3)
    visibleReasons.forEach((reason) => {
      expect(reason.closest('.runtime-workspace__section-command-cell')).not.toBeNull()
    })
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
