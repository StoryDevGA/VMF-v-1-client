import { describe, expect, it } from 'vitest'
import {
  buildAcceptRuntimeDiscoveryQuery,
  buildAcceptRuntimeSectionQuery,
  buildApproveRuntimeOutcomeDraftQuery,
  buildClearRuntimeSectionEvidenceQuery,
  buildCreateRuntimeInstanceQuery,
  buildCreateRuntimeOutcomeSessionQuery,
  buildCreateRuntimeOutputRequestQuery,
  buildCreateRuntimeRevisionQuery,
  buildExecuteRuntimeActionQuery,
  buildExportRuntimeOutcomeAssetQuery,
  buildExportRuntimeOutputAssetQuery,
  buildGenerateRuntimeOutputRequestQuery,
  buildGenerateRuntimeOutcomeResponseQuery,
  buildMutateRuntimeStateQuery,
  buildPublishRuntimeOutcomeAssetQuery,
  buildPublishRuntimeOutputAssetQuery,
  buildRuntimeInstanceDetailQuery,
  buildRuntimeInstanceListQuery,
  buildRuntimeEvidenceQuery,
  buildRuntimeOutputAssetQuery,
  buildRuntimeOutputAssetsQuery,
  buildRuntimeOutputLabDefinitionsQuery,
  buildRuntimeOutputLabQuery,
  buildRuntimeOutputLabReadinessQuery,
  buildRuntimeOutcomeStudioQuery,
  buildRuntimeOutcomeStudioReadinessQuery,
  buildRuntimeOutcomeAssetQuery,
  buildRuntimeOutcomeAssetVersionQuery,
  buildRuntimeOutcomeSessionAssetsQuery,
  buildRuntimeOutcomeSessionQuery,
  buildRuntimeRendererQuery,
  buildRuntimeTruthQualityQuery,
  buildResetRuntimeDiscoveryQuery,
  buildRebuildRuntimeIntelligenceGraphQuery,
  buildReviewRuntimeDiscoveryEvidenceQuery,
  buildReviewAllRuntimeSectionEvidenceQuery,
  buildReviewRuntimeSectionEvidenceQuery,
  buildRuntimeIntelligenceGraphCoverageQuery,
  buildRuntimeIntelligenceGraphHealthQuery,
  buildRuntimeIntelligenceGraphNodeLineageQuery,
  buildRuntimeIntelligenceGraphQuery,
  buildRuntimeIntelligenceGraphSectionDependenciesQuery,
  buildSubmitRuntimeOutcomeMessageQuery,
  buildUpdateRuntimeOutcomeSessionFromLatestTruthQuery,
  buildUpdateRuntimeDiscoveryInputsQuery,
  buildUpdateRuntimeSectionEvidenceQuery,
  DEFAULT_RUNTIME_INSTANCE_TYPE,
  getAcceptRuntimeDiscoveryInvalidationTags,
  getAcceptRuntimeSectionInvalidationTags,
  getApproveRuntimeOutcomeDraftInvalidationTags,
  getClearRuntimeSectionEvidenceInvalidationTags,
  getCreateRuntimeInstanceInvalidationTags,
  getCreateRuntimeOutcomeSessionInvalidationTags,
  getCreateRuntimeOutputRequestInvalidationTags,
  getCreateRuntimeRevisionInvalidationTags,
  getExecuteRuntimeActionInvalidationTags,
  getGenerateRuntimeOutputRequestInvalidationTags,
  getGenerateRuntimeOutcomeResponseInvalidationTags,
  getMutateRuntimeStateInvalidationTags,
  getPublishRuntimeOutcomeAssetInvalidationTags,
  getPublishRuntimeOutputAssetInvalidationTags,
  getRuntimeInstanceDetailTags,
  getRuntimeInstanceListTags,
  getRuntimeRendererTags,
  getResetRuntimeDiscoveryInvalidationTags,
  getRebuildRuntimeIntelligenceGraphInvalidationTags,
  getReviewRuntimeDiscoveryEvidenceInvalidationTags,
  getReviewAllRuntimeSectionEvidenceInvalidationTags,
  getReviewRuntimeSectionEvidenceInvalidationTags,
  getSubmitRuntimeOutcomeMessageInvalidationTags,
  getUpdateRuntimeOutcomeSessionFromLatestTruthInvalidationTags,
  getUpdateRuntimeDiscoveryInputsInvalidationTags,
  getUpdateRuntimeSectionEvidenceInvalidationTags,
  runtimeInstanceApi,
  runtimeInstanceListTag,
  useAcceptRuntimeDiscoveryMutation,
  useAcceptRuntimeSectionMutation,
  useApproveRuntimeOutcomeDraftMutation,
  useClearRuntimeSectionEvidenceMutation,
  useCreateRuntimeInstanceMutation,
  useCreateRuntimeOutcomeSessionMutation,
  useCreateRuntimeOutputRequestMutation,
  useCreateRuntimeRevisionMutation,
  useExecuteRuntimeActionMutation,
  useGenerateRuntimeOutputRequestMutation,
  useGenerateRuntimeOutcomeResponseMutation,
  useGetRuntimeEvidenceQuery,
  useGetRuntimeInstanceQuery,
  useGetRuntimeIntelligenceGraphCoverageQuery,
  useGetRuntimeIntelligenceGraphHealthQuery,
  useGetRuntimeIntelligenceGraphNodeLineageQuery,
  useGetRuntimeIntelligenceGraphQuery,
  useGetRuntimeIntelligenceGraphSectionDependenciesQuery,
  useGetRuntimeOutputAssetQuery,
  useGetRuntimeOutputAssetsQuery,
  useGetRuntimeOutputLabDefinitionsQuery,
  useGetRuntimeOutputLabQuery,
  useGetRuntimeOutputLabReadinessQuery,
  useGetRuntimeOutcomeStudioQuery,
  useGetRuntimeOutcomeStudioReadinessQuery,
  useGetRuntimeOutcomeAssetQuery,
  useGetRuntimeOutcomeAssetVersionQuery,
  useGetRuntimeOutcomeSessionAssetsQuery,
  useGetRuntimeOutcomeSessionQuery,
  useLazyGetRuntimeOutcomeAssetQuery,
  useGetRuntimeRendererQuery,
  useGetRuntimeTruthQualityQuery,
  useLazyExportRuntimeOutcomeAssetQuery,
  useLazyExportRuntimeOutputAssetQuery,
  useListRuntimeInstancesQuery,
  useMutateRuntimeStateMutation,
  usePublishRuntimeOutcomeAssetMutation,
  usePublishRuntimeOutputAssetMutation,
  useResetRuntimeDiscoveryMutation,
  useRebuildRuntimeIntelligenceGraphMutation,
  useReviewRuntimeDiscoveryEvidenceMutation,
  useReviewAllRuntimeSectionEvidenceMutation,
  useReviewRuntimeSectionEvidenceMutation,
  useSubmitRuntimeOutcomeMessageMutation,
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation,
  useUpdateRuntimeSectionEvidenceMutation,
  useUpdateRuntimeDiscoveryInputsMutation,
} from './runtimeInstanceApi.js'

describe('runtimeInstanceApi', () => {
  it('registers expected endpoint definitions', () => {
    expect(runtimeInstanceApi.endpoints).toHaveProperty('listRuntimeInstances')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('createRuntimeInstance')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('createRuntimeRevision')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeInstance')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeIntelligenceGraph')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeIntelligenceGraphHealth')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeIntelligenceGraphCoverage')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeIntelligenceGraphNodeLineage')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeIntelligenceGraphSectionDependencies')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeRenderer')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeTruthQuality')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutputLab')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutputLabReadiness')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutputLabDefinitions')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutcomeStudio')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutcomeStudioReadiness')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('createRuntimeOutcomeSession')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutcomeSession')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutcomeSessionAssets')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutcomeAsset')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutcomeAssetVersion')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('approveRuntimeOutcomeDraft')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('publishRuntimeOutcomeAsset')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('exportRuntimeOutcomeAsset')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('submitRuntimeOutcomeMessage')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('generateRuntimeOutcomeResponse')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('updateRuntimeOutcomeSessionFromLatestTruth')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('createRuntimeOutputRequest')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('generateRuntimeOutputRequest')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutputAssets')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeOutputAsset')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('publishRuntimeOutputAsset')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('exportRuntimeOutputAsset')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('mutateRuntimeState')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('rebuildRuntimeIntelligenceGraph')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('updateRuntimeDiscoveryInputs')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('acceptRuntimeDiscovery')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('resetRuntimeDiscovery')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('reviewRuntimeDiscoveryEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('updateRuntimeSectionEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('clearRuntimeSectionEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('reviewRuntimeSectionEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('reviewAllRuntimeSectionEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('acceptRuntimeSection')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('executeRuntimeAction')
  })

  it('exports runtime instance hooks', () => {
    expect(typeof useListRuntimeInstancesQuery).toBe('function')
    expect(typeof useCreateRuntimeInstanceMutation).toBe('function')
    expect(typeof useCreateRuntimeRevisionMutation).toBe('function')
    expect(typeof useGetRuntimeInstanceQuery).toBe('function')
    expect(typeof useGetRuntimeEvidenceQuery).toBe('function')
    expect(typeof useGetRuntimeIntelligenceGraphQuery).toBe('function')
    expect(typeof useGetRuntimeIntelligenceGraphHealthQuery).toBe('function')
    expect(typeof useGetRuntimeIntelligenceGraphCoverageQuery).toBe('function')
    expect(typeof useGetRuntimeIntelligenceGraphNodeLineageQuery).toBe('function')
    expect(typeof useGetRuntimeIntelligenceGraphSectionDependenciesQuery).toBe('function')
    expect(typeof useGetRuntimeRendererQuery).toBe('function')
    expect(typeof useGetRuntimeTruthQualityQuery).toBe('function')
    expect(typeof useGetRuntimeOutputLabQuery).toBe('function')
    expect(typeof useGetRuntimeOutputLabReadinessQuery).toBe('function')
    expect(typeof useGetRuntimeOutputLabDefinitionsQuery).toBe('function')
    expect(typeof useGetRuntimeOutcomeStudioQuery).toBe('function')
    expect(typeof useGetRuntimeOutcomeStudioReadinessQuery).toBe('function')
    expect(typeof useCreateRuntimeOutcomeSessionMutation).toBe('function')
    expect(typeof useGetRuntimeOutcomeSessionQuery).toBe('function')
    expect(typeof useGetRuntimeOutcomeSessionAssetsQuery).toBe('function')
    expect(typeof useGetRuntimeOutcomeAssetQuery).toBe('function')
    expect(typeof useLazyGetRuntimeOutcomeAssetQuery).toBe('function')
    expect(typeof useGetRuntimeOutcomeAssetVersionQuery).toBe('function')
    expect(typeof useApproveRuntimeOutcomeDraftMutation).toBe('function')
    expect(typeof usePublishRuntimeOutcomeAssetMutation).toBe('function')
    expect(typeof useLazyExportRuntimeOutcomeAssetQuery).toBe('function')
    expect(typeof useSubmitRuntimeOutcomeMessageMutation).toBe('function')
    expect(typeof useGenerateRuntimeOutcomeResponseMutation).toBe('function')
    expect(typeof useUpdateRuntimeOutcomeSessionFromLatestTruthMutation).toBe('function')
    expect(typeof useCreateRuntimeOutputRequestMutation).toBe('function')
    expect(typeof useGenerateRuntimeOutputRequestMutation).toBe('function')
    expect(typeof useGetRuntimeOutputAssetsQuery).toBe('function')
    expect(typeof useGetRuntimeOutputAssetQuery).toBe('function')
    expect(typeof usePublishRuntimeOutputAssetMutation).toBe('function')
    expect(typeof useLazyExportRuntimeOutputAssetQuery).toBe('function')
    expect(typeof useMutateRuntimeStateMutation).toBe('function')
    expect(typeof useRebuildRuntimeIntelligenceGraphMutation).toBe('function')
    expect(typeof useUpdateRuntimeDiscoveryInputsMutation).toBe('function')
    expect(typeof useAcceptRuntimeDiscoveryMutation).toBe('function')
    expect(typeof useResetRuntimeDiscoveryMutation).toBe('function')
    expect(typeof useReviewRuntimeDiscoveryEvidenceMutation).toBe('function')
    expect(typeof useUpdateRuntimeSectionEvidenceMutation).toBe('function')
    expect(typeof useClearRuntimeSectionEvidenceMutation).toBe('function')
    expect(typeof useReviewRuntimeSectionEvidenceMutation).toBe('function')
    expect(typeof useReviewAllRuntimeSectionEvidenceMutation).toBe('function')
    expect(typeof useAcceptRuntimeSectionMutation).toBe('function')
    expect(typeof useExecuteRuntimeActionMutation).toBe('function')
  })

  it('exposes endpoint initiate functions', () => {
    expect(typeof runtimeInstanceApi.endpoints.listRuntimeInstances.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.createRuntimeInstance.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.createRuntimeRevision.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeInstance.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeIntelligenceGraph.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeIntelligenceGraphHealth.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeIntelligenceGraphCoverage.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeIntelligenceGraphNodeLineage.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeIntelligenceGraphSectionDependencies.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeRenderer.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeTruthQuality.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutputLab.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutputLabReadiness.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutputLabDefinitions.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutcomeStudio.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutcomeStudioReadiness.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.createRuntimeOutcomeSession.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutcomeSession.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutcomeSessionAssets.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutcomeAsset.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutcomeAssetVersion.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.approveRuntimeOutcomeDraft.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.publishRuntimeOutcomeAsset.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.exportRuntimeOutcomeAsset.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.submitRuntimeOutcomeMessage.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.generateRuntimeOutcomeResponse.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.updateRuntimeOutcomeSessionFromLatestTruth.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.createRuntimeOutputRequest.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.generateRuntimeOutputRequest.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutputAssets.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeOutputAsset.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.publishRuntimeOutputAsset.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.exportRuntimeOutputAsset.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.mutateRuntimeState.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.rebuildRuntimeIntelligenceGraph.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.updateRuntimeDiscoveryInputs.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.acceptRuntimeDiscovery.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.resetRuntimeDiscovery.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.reviewRuntimeDiscoveryEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.updateRuntimeSectionEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.clearRuntimeSectionEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.reviewRuntimeSectionEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.reviewAllRuntimeSectionEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.acceptRuntimeSection.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.executeRuntimeAction.initiate).toBe('function')
  })

  it('builds the list query with the required runtime instance filters', () => {
    expect(buildRuntimeInstanceListQuery({
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      runtimeType: 'VALUE_NARRATIVE',
      q: 'Northwind',
      status: 'ACTIVE',
      page: 2,
      pageSize: 25,
    })).toBe(
      '/runtime-instances?customerId=cust-1&tenantId=tenant-1&runtimeType=VALUE_NARRATIVE&q=Northwind&status=ACTIVE&page=2&pageSize=25',
    )
  })

  it('builds create and detail runtime instance requests', () => {
    const body = {
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      runtimeType: 'VALUE_NARRATIVE',
      frameworkPackageId: 'pkg-1',
      name: 'Northwind Value Narrative',
    }

    expect(buildCreateRuntimeInstanceQuery({ body })).toEqual({
      url: '/runtime-instances',
      method: 'POST',
      body,
    })
    expect(buildCreateRuntimeRevisionQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'Refresh GTM claims',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/revisions',
      method: 'POST',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'Refresh GTM claims',
      },
    })
    expect(buildRuntimeInstanceDetailQuery({ runtimeInstanceId: 'value-narrative-001' }))
      .toBe('/runtime-instances/value-narrative-001')
    expect(buildRuntimeInstanceDetailQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001')
    expect(buildRuntimeRendererQuery({ runtimeInstanceId: 'value-narrative-001' }))
      .toBe('/runtime-instances/value-narrative-001/renderer')
    expect(buildRuntimeRendererQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/renderer')
    expect(buildRuntimeTruthQualityQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/truth-quality')
    expect(buildRuntimeOutputLabQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/output-lab')
    expect(buildRuntimeOutputLabReadinessQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/output-lab/readiness')
    expect(buildRuntimeOutputLabDefinitionsQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/output-lab/definitions')
    expect(buildRuntimeOutcomeStudioQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/outcome-studio')
    expect(buildRuntimeOutcomeStudioReadinessQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/outcome-studio/readiness')
    expect(buildCreateRuntimeOutcomeSessionQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        sourceOutputAssetId: 'out/asset-001',
        prompt: 'Draft the governed outcome.',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/outcome-studio/sessions',
      method: 'POST',
      body: {
        sourceOutputAssetId: 'out/asset-001',
        prompt: 'Draft the governed outcome.',
      },
    })
    expect(buildRuntimeOutcomeSessionQuery({
      runtimeInstanceId: 'value narrative/001',
      sessionId: 'out/sess-001',
    })).toBe('/runtime-instances/value%20narrative%2F001/outcome-studio/sessions/out%2Fsess-001')
    expect(buildRuntimeOutcomeSessionAssetsQuery({
      runtimeInstanceId: 'value narrative/001',
      sessionId: 'out/sess-001',
    })).toBe('/runtime-instances/value%20narrative%2F001/outcome-studio/sessions/out%2Fsess-001/assets')
    expect(buildRuntimeOutcomeAssetQuery({
      runtimeInstanceId: 'value narrative/001',
      outcomeAssetId: 'outcome/asset-001',
    })).toBe('/runtime-instances/value%20narrative%2F001/outcome-studio/assets/outcome%2Fasset-001')
    expect(buildRuntimeOutcomeAssetVersionQuery({
      runtimeInstanceId: 'value narrative/001',
      outcomeAssetId: 'outcome/asset-001',
      outcomeAssetVersionId: 'version/current-001',
    })).toBe('/runtime-instances/value%20narrative%2F001/outcome-studio/assets/outcome%2Fasset-001/versions/version%2Fcurrent-001')
    expect(buildApproveRuntimeOutcomeDraftQuery({
      runtimeInstanceId: 'value narrative/001',
      sessionId: 'out/sess-001',
      draftId: 'outcome/draft-001',
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/outcome-studio/sessions/out%2Fsess-001/drafts/outcome%2Fdraft-001/approve',
      method: 'POST',
      body: {},
    })
    expect(buildPublishRuntimeOutcomeAssetQuery({
      runtimeInstanceId: 'value narrative/001',
      outcomeAssetId: 'outcome/asset-001',
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/outcome-studio/assets/outcome%2Fasset-001/publish',
      method: 'POST',
      body: {},
    })
    expect(buildExportRuntimeOutcomeAssetQuery({
      runtimeInstanceId: 'value narrative/001',
      outcomeAssetId: 'outcome/asset-001',
      format: 'markdown',
    })).toBe('/runtime-instances/value%20narrative%2F001/outcome-studio/assets/outcome%2Fasset-001/export/MARKDOWN')
    expect(buildSubmitRuntimeOutcomeMessageQuery({
      runtimeInstanceId: 'value narrative/001',
      sessionId: 'out/sess-001',
      body: {
        prompt: 'Continue the governed outcome.',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/outcome-studio/sessions/out%2Fsess-001/messages',
      method: 'POST',
      body: {
        prompt: 'Continue the governed outcome.',
      },
    })
    expect(buildGenerateRuntimeOutcomeResponseQuery({
      runtimeInstanceId: 'value narrative/001',
      sessionId: 'out/sess-001',
      messageId: 'out/msg-001',
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/outcome-studio/sessions/out%2Fsess-001/messages/out%2Fmsg-001/generate-response',
      method: 'POST',
      body: {},
    })
    expect(buildUpdateRuntimeOutcomeSessionFromLatestTruthQuery({
      runtimeInstanceId: 'value narrative/001',
      sessionId: 'out/sess-001',
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/outcome-studio/sessions/out%2Fsess-001/update-from-latest-truth',
      method: 'POST',
      body: {},
    })
    expect(buildCreateRuntimeOutputRequestQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        outputTypeKey: 'EXECUTIVE_BRIEF',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/output-lab/requests',
      method: 'POST',
      body: {
        outputTypeKey: 'EXECUTIVE_BRIEF',
      },
    })
    expect(buildGenerateRuntimeOutputRequestQuery({
      runtimeInstanceId: 'value narrative/001',
      outputRequestId: 'out/request-001',
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/output-lab/requests/out%2Frequest-001/generate',
      method: 'POST',
      body: {},
    })
    expect(buildRuntimeOutputAssetsQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/output-lab/assets')
    expect(buildRuntimeOutputAssetQuery({
      runtimeInstanceId: 'value narrative/001',
      outputAssetId: 'out/asset-001',
    })).toBe('/runtime-instances/value%20narrative%2F001/output-lab/assets/out%2Fasset-001')
    expect(buildPublishRuntimeOutputAssetQuery({
      runtimeInstanceId: 'value narrative/001',
      outputAssetId: 'out/asset-001',
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/output-lab/assets/out%2Fasset-001/publish',
      method: 'POST',
      body: {},
    })
    expect(buildExportRuntimeOutputAssetQuery({
      runtimeInstanceId: 'value narrative/001',
      outputAssetId: 'out/asset-001',
      format: 'markdown',
    })).toBe('/runtime-instances/value%20narrative%2F001/output-lab/assets/out%2Fasset-001/export/MARKDOWN')
    expect(buildRuntimeEvidenceQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/evidence')
    expect(buildRuntimeIntelligenceGraphQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/intelligence-graph')
    expect(buildRuntimeIntelligenceGraphHealthQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/intelligence-graph/health')
    expect(buildRuntimeIntelligenceGraphCoverageQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/intelligence-graph/coverage')
    expect(buildRuntimeIntelligenceGraphNodeLineageQuery({
      runtimeInstanceId: 'value narrative/001',
      nodeId: 'evidence:company/source',
    })).toBe('/runtime-instances/value%20narrative%2F001/intelligence-graph/nodes/evidence%3Acompany%2Fsource/lineage')
    expect(buildRuntimeIntelligenceGraphSectionDependenciesQuery({
      runtimeInstanceId: 'value narrative/001',
      sectionKey: 'value_drivers',
    })).toBe('/runtime-instances/value%20narrative%2F001/intelligence-graph/sections/value_drivers/dependencies')
    expect(buildRebuildRuntimeIntelligenceGraphQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        trigger: 'EXPLICIT_REBUILD',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/intelligence-graph/rebuild',
      method: 'POST',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        trigger: 'EXPLICIT_REBUILD',
      },
    })
    expect(buildMutateRuntimeStateQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        operation: 'WRITE',
        value: 'Updated problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/data',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        operation: 'WRITE',
        value: 'Updated problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildExecuteRuntimeActionQuery({
      runtimeInstanceId: 'value narrative/001',
      actionKey: 'SUBMIT_FOR_REVIEW',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/actions/SUBMIT_FOR_REVIEW',
      method: 'POST',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildUpdateRuntimeDiscoveryInputsQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        inputs: {
          companyName: 'Acme',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/discovery-inputs',
      method: 'PATCH',
      body: {
        inputs: {
          companyName: 'Acme',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildAcceptRuntimeDiscoveryQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/discovery-acceptance',
      method: 'PATCH',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildResetRuntimeDiscoveryQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        confirmReset: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'USER_REQUESTED_DISCOVERY_RESET',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/discovery-reset',
      method: 'PATCH',
      body: {
        confirmReset: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'USER_REQUESTED_DISCOVERY_RESET',
      },
    })
    expect(buildReviewRuntimeDiscoveryEvidenceQuery({
      runtimeInstanceId: 'value narrative/001',
      evidenceObjectId: 'evidence/company',
      body: {
        reviewStatus: 'REJECTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/discovery-evidence/evidence%2Fcompany/review',
      method: 'PATCH',
      body: {
        reviewStatus: 'REJECTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildUpdateRuntimeSectionEvidenceQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        documentSources: [
          { fileName: 'value-notes.md', textContent: 'Value evidence.' },
        ],
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/section-evidence',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        documentSources: [
          { fileName: 'value-notes.md', textContent: 'Value evidence.' },
        ],
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildReviewRuntimeSectionEvidenceQuery({
      runtimeInstanceId: 'value narrative/001',
      evidenceObjectId: 'section/evidence',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/section-evidence/section%2Fevidence/review',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildReviewAllRuntimeSectionEvidenceQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/section-evidence/review-all',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildClearRuntimeSectionEvidenceQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        confirmClear: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'USER_REQUESTED_SECTION_EVIDENCE_CLEAR',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/section-evidence/clear',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        confirmClear: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'USER_REQUESTED_SECTION_EVIDENCE_CLEAR',
      },
    })
    expect(buildAcceptRuntimeSectionQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/section-acceptance',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
  })

  it('provides and invalidates runtime instance cache tags by runtime type and id', () => {
    const listTags = getRuntimeInstanceListTags({
      data: [
        { id: 'runtime-1', runtimeInstanceKey: 'value-narrative-001' },
        { _id: 'runtime-2', runtimeInstanceKey: 'value-narrative-002' },
        { runtimeInstanceKey: 'value-narrative-003' },
      ],
    }, null, { runtimeType: 'VALUE_NARRATIVE' })

    expect(listTags).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      { type: 'RuntimeInstance', id: 'runtime-2' },
      { type: 'RuntimeInstance', id: 'value-narrative-002' },
      { type: 'RuntimeInstance', id: 'value-narrative-003' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getRuntimeInstanceListTags(undefined, null, { runtimeType: 'DEAL_ANALYSIS' }))
      .toEqual([runtimeInstanceListTag('DEAL_ANALYSIS')])
    expect(getCreateRuntimeInstanceInvalidationTags(null, null, {
      body: { runtimeType: 'VALUE_NARRATIVE' },
    })).toEqual([runtimeInstanceListTag('VALUE_NARRATIVE')])
    expect(getCreateRuntimeInstanceInvalidationTags(null, null, {
      body: { name: 'Defaulted Value Narrative' },
    })).toEqual([runtimeInstanceListTag(DEFAULT_RUNTIME_INSTANCE_TYPE)])
    expect(getCreateRuntimeRevisionInvalidationTags({
      data: {
        id: 'runtime-revision-2',
        runtimeInstanceKey: 'value-narrative-001-rev-2',
        runtimeType: 'VALUE_NARRATIVE',
      },
    }, null, { runtimeInstanceId: 'value-narrative-001' })).toEqual([
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      { type: 'RuntimeInstance', id: 'runtime-revision-2' },
      { type: 'RuntimeInstance', id: 'value-narrative-001-rev-2' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getRuntimeInstanceDetailTags({
      data: { id: 'runtime-1', runtimeInstanceKey: 'value-narrative-001' },
    }, null, { runtimeInstanceId: 'value-narrative-001' })).toEqual([
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      { type: 'RuntimeInstance', id: 'runtime-1' },
    ])
    expect(getCreateRuntimeOutcomeSessionInvalidationTags({
      data: { runtimeInstanceKey: 'value-narrative-001' },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
    ])
    expect(getSubmitRuntimeOutcomeMessageInvalidationTags({
      data: { runtimeInstanceKey: 'value-narrative-001' },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
    ])
    expect(getGenerateRuntimeOutcomeResponseInvalidationTags({
      data: { runtimeInstanceKey: 'value-narrative-001' },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
    ])
    expect(getUpdateRuntimeOutcomeSessionFromLatestTruthInvalidationTags({
      data: { runtimeInstanceKey: 'value-narrative-001' },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
    ])
    expect(getApproveRuntimeOutcomeDraftInvalidationTags({
      data: { runtimeInstanceKey: 'value-narrative-001' },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
    ])
    expect(getPublishRuntimeOutcomeAssetInvalidationTags({
      data: { runtimeInstanceKey: 'value-narrative-001' },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
    ])
    expect(getRuntimeRendererTags({
      data: {
        runtimeInstance: { id: 'runtime-1', runtimeInstanceKey: 'value-narrative-001' },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
    ])
    expect(getMutateRuntimeStateInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getExecuteRuntimeActionInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getCreateRuntimeOutputRequestInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getGenerateRuntimeOutputRequestInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getPublishRuntimeOutputAssetInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getUpdateRuntimeDiscoveryInputsInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getAcceptRuntimeDiscoveryInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getResetRuntimeDiscoveryInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getReviewRuntimeDiscoveryEvidenceInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getUpdateRuntimeSectionEvidenceInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getReviewRuntimeSectionEvidenceInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getReviewAllRuntimeSectionEvidenceInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getClearRuntimeSectionEvidenceInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getAcceptRuntimeSectionInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getRebuildRuntimeIntelligenceGraphInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
  })
})
