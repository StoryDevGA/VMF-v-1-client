import { describe, expect, it } from 'vitest'
import {
  buildActivateOutcomeKnowledgePackVersionQuery,
  buildCloneOutcomeKnowledgePackManifestQuery,
  buildCompareOutcomeKnowledgePackManifestsQuery,
  buildCreateOutcomeKnowledgePackVersionQuery,
  buildCreateOutcomeKnowledgePackManifestQuery,
  buildDeleteOutcomeKnowledgePackQuery,
  buildDeprecateOutcomeKnowledgePackVersionQuery,
  buildDisableOutcomeKnowledgePackVersionQuery,
  buildImportOutcomeKnowledgePackSourceDocumentDraftQuery,
  buildOutcomeKnowledgePackManifestDetailQuery,
  buildOutcomeKnowledgePackManifestListQuery,
  buildOutcomeKnowledgePackDetailQuery,
  buildOutcomeKnowledgePackListQuery,
  buildOutcomeKnowledgePackVersionQuery,
  buildPreviewOutcomeKnowledgePackReasoningContextQuery,
  buildPreviewOutcomeKnowledgePackManifestResolutionQuery,
  buildPreviewOutcomeKnowledgePackVersionContentQuery,
  buildPreviewOutcomeKnowledgePackResolutionQuery,
  buildRollbackOutcomeKnowledgePackQuery,
  buildUpdateOutcomeKnowledgePackManifestQuery,
  buildUpdateOutcomeKnowledgePackReviewQuery,
  buildValidateOutcomeKnowledgePackVersionQuery,
  outcomeKnowledgePacksApi,
  useActivateOutcomeKnowledgePackVersionMutation,
  useCloneOutcomeKnowledgePackManifestMutation,
  useCompareOutcomeKnowledgePackManifestsQuery,
  useCreateOutcomeKnowledgePackManifestMutation,
  useCreateOutcomeKnowledgePackVersionMutation,
  useDeleteOutcomeKnowledgePackMutation,
  useDeprecateOutcomeKnowledgePackVersionMutation,
  useDisableOutcomeKnowledgePackVersionMutation,
  useGetOutcomeKnowledgePackManifestQuery,
  useGetOutcomeKnowledgePackQuery,
  useGetOutcomeKnowledgePackVersionQuery,
  useImportOutcomeKnowledgePackSourceDocumentDraftMutation,
  useLazyPreviewOutcomeKnowledgePackVersionContentQuery,
  useListOutcomeKnowledgePackManifestsQuery,
  useListOutcomeKnowledgePacksQuery,
  usePreviewOutcomeKnowledgePackManifestResolutionQuery,
  usePreviewOutcomeKnowledgePackReasoningContextQuery,
  usePreviewOutcomeKnowledgePackResolutionQuery,
  useRollbackOutcomeKnowledgePackMutation,
  useUpdateOutcomeKnowledgePackManifestMutation,
  useUpdateOutcomeKnowledgePackReviewMutation,
  useValidateOutcomeKnowledgePackVersionMutation,
} from './outcomeKnowledgePacksApi.js'

describe('outcomeKnowledgePacksApi', () => {
  it('registers expected endpoint definitions', () => {
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('listOutcomeKnowledgePacks')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('getOutcomeKnowledgePack')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('getOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('previewOutcomeKnowledgePackVersionContent')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('createOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints)
      .toHaveProperty('importOutcomeKnowledgePackSourceDocumentDraft')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('deleteOutcomeKnowledgePack')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('validateOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('updateOutcomeKnowledgePackReview')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('activateOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('deprecateOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('disableOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('rollbackOutcomeKnowledgePack')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('previewOutcomeKnowledgePackResolution')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('listOutcomeKnowledgePackManifests')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('getOutcomeKnowledgePackManifest')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('previewOutcomeKnowledgePackManifestResolution')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('previewOutcomeKnowledgePackReasoningContext')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('compareOutcomeKnowledgePackManifests')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('createOutcomeKnowledgePackManifest')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('updateOutcomeKnowledgePackManifest')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('cloneOutcomeKnowledgePackManifest')
  })

  it('exports query and mutation hooks', () => {
    expect(typeof useListOutcomeKnowledgePacksQuery).toBe('function')
    expect(typeof useGetOutcomeKnowledgePackQuery).toBe('function')
    expect(typeof useGetOutcomeKnowledgePackVersionQuery).toBe('function')
    expect(typeof useLazyPreviewOutcomeKnowledgePackVersionContentQuery).toBe('function')
    expect(typeof useCreateOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useImportOutcomeKnowledgePackSourceDocumentDraftMutation).toBe('function')
    expect(typeof useDeleteOutcomeKnowledgePackMutation).toBe('function')
    expect(typeof useValidateOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useUpdateOutcomeKnowledgePackReviewMutation).toBe('function')
    expect(typeof useActivateOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useDeprecateOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useDisableOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useRollbackOutcomeKnowledgePackMutation).toBe('function')
    expect(typeof usePreviewOutcomeKnowledgePackResolutionQuery).toBe('function')
    expect(typeof useListOutcomeKnowledgePackManifestsQuery).toBe('function')
    expect(typeof useGetOutcomeKnowledgePackManifestQuery).toBe('function')
    expect(typeof usePreviewOutcomeKnowledgePackManifestResolutionQuery).toBe('function')
    expect(typeof usePreviewOutcomeKnowledgePackReasoningContextQuery).toBe('function')
    expect(typeof useCompareOutcomeKnowledgePackManifestsQuery).toBe('function')
    expect(typeof useCreateOutcomeKnowledgePackManifestMutation).toBe('function')
    expect(typeof useUpdateOutcomeKnowledgePackManifestMutation).toBe('function')
    expect(typeof useCloneOutcomeKnowledgePackManifestMutation).toBe('function')
  })

  it('builds the knowledge pack list request with supported filters', () => {
    expect(buildOutcomeKnowledgePackListQuery({
      page: 2,
      pageSize: 50,
      q: 'truth',
      packType: 'TRUTH_CERTIFICATION',
      status: 'ACTIVE',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs',
      params: {
        page: 2,
        pageSize: 50,
        q: 'truth',
        packType: 'TRUTH_CERTIFICATION',
        status: 'ACTIVE',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
    })
  })

  it('builds detail and version requests with encoded identifiers', () => {
    expect(buildOutcomeKnowledgePackDetailQuery({
      packId: 'OUTPUT_SCHEMA:output-schemas-pack',
    })).toBe('/super-admin/outcome-studio/knowledge-packs/OUTPUT_SCHEMA%3Aoutput-schemas-pack')

    expect(buildOutcomeKnowledgePackVersionQuery({
      packId: 'output-schemas-pack',
      versionId: 'output-schemas-pack@1.0.0',
    })).toBe(
      '/super-admin/outcome-studio/knowledge-packs/output-schemas-pack/versions/output-schemas-pack%401.0.0',
    )

    expect(buildPreviewOutcomeKnowledgePackVersionContentQuery({
      packId: 'output-schemas-pack',
      versionId: 'output-schemas-pack@1.0.0',
    })).toBe(
      '/super-admin/outcome-studio/knowledge-packs/output-schemas-pack/versions/output-schemas-pack%401.0.0/content-preview',
    )
  })

  it('builds create, validate, activate, and resolution preview requests', () => {
    expect(buildCreateOutcomeKnowledgePackVersionQuery({
      packId: 'truth-certification-pack',
      semanticVersion: '1.0.1',
      schemaVersion: '1.0.0',
      sourceFilename: 'truth-certification-pack-v1.yaml',
      content: 'source content',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/versions',
      method: 'POST',
      body: {
        semanticVersion: '1.0.1',
        schemaVersion: '1.0.0',
        contentFormat: 'YAML',
        sourceFilename: 'truth-certification-pack-v1.yaml',
        content: 'source content',
      },
    })

    expect(buildImportOutcomeKnowledgePackSourceDocumentDraftQuery({
      packType: 'et',
      packKey: 'execution-translation',
      label: 'Execution Translation',
      description: 'Canonical ET source document.',
      purposeCategory: 'OUTPUT',
      semanticVersion: '2.8.0',
      sourceAuthority: 'StorylineOS',
      contentFormat: 'MARKDOWN',
      sourceDocument: {
        filename: 'ET v2.8 Canonical Execution Translation System.md',
        contentType: 'text/markdown',
        fileExtension: 'md',
        sizeBytes: 25,
      },
      extractedText: 'Extracted ET source text.',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/source-document-import',
      method: 'POST',
      body: {
        packType: 'ET',
        packKey: 'execution-translation',
        label: 'Execution Translation',
        description: 'Canonical ET source document.',
        purposeCategory: 'OUTPUT',
        semanticVersion: '2.8.0',
        schemaVersion: '1.0.0',
        sourceAuthority: 'StorylineOS',
        executionMode: 'PROVIDER_CONTEXT',
        visibility: 'PLATFORM',
        contentFormat: 'MARKDOWN',
        extractedText: 'Extracted ET source text.',
        sourceDocument: {
          filename: 'ET v2.8 Canonical Execution Translation System.md',
          contentType: 'text/markdown',
          fileExtension: 'md',
          sizeBytes: 25,
        },
      },
    })

    expect(buildImportOutcomeKnowledgePackSourceDocumentDraftQuery({
      packType: 'system',
      packKey: 'enterprise-technology',
      label: 'Enterprise Technology',
      semanticVersion: '5.0.0',
      contentFormat: 'PDF',
      sourceDocument: {
        filename: 'Enterprise Technology Framework v5.pdf',
        contentType: 'application/pdf',
        fileExtension: 'pdf',
        sizeBytes: 2048,
        contentBase64: 'JVBERi0xLjQ=',
      },
      extractedText: undefined,
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/source-document-import',
      method: 'POST',
      body: {
        packType: 'SYSTEM',
        packKey: 'enterprise-technology',
        label: 'Enterprise Technology',
        semanticVersion: '5.0.0',
        schemaVersion: '1.0.0',
        executionMode: 'PROVIDER_CONTEXT',
        visibility: 'PLATFORM',
        contentFormat: 'PDF',
        sourceDocument: {
          filename: 'Enterprise Technology Framework v5.pdf',
          contentType: 'application/pdf',
          fileExtension: 'pdf',
          contentBase64: 'JVBERi0xLjQ=',
          sizeBytes: 2048,
        },
      },
    })

    expect(buildValidateOutcomeKnowledgePackVersionQuery({
      packId: 'truth-certification-pack',
      versionId: 'truth-certification-pack@1.0.1',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/versions/truth-certification-pack%401.0.1/validate',
      method: 'POST',
      body: {},
    })

    expect(buildUpdateOutcomeKnowledgePackReviewQuery({
      packId: 'enterprise-technology',
      versionId: 'enterprise-technology@5.0.0',
      reviewStatus: 'approved',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/enterprise-technology/versions/enterprise-technology%405.0.0/review',
      method: 'POST',
      body: { reviewStatus: 'APPROVED' },
    })

    expect(buildActivateOutcomeKnowledgePackVersionQuery({
      packId: 'truth-certification-pack',
      versionId: 'truth-certification-pack@1.0.1',
      scopeType: 'global',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/versions/truth-certification-pack%401.0.1/activate',
      method: 'POST',
      body: { scopeType: 'GLOBAL' },
    })

    expect(buildPreviewOutcomeKnowledgePackResolutionQuery({
      frameworkKey: 'VMF',
      runtimeType: 'VALUE_NARRATIVE',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/resolution-preview',
      params: {
        frameworkKey: 'VMF',
        runtimeType: 'VALUE_NARRATIVE',
      },
    })
  })

  it('builds lifecycle mutation requests', () => {
    expect(buildDeleteOutcomeKnowledgePackQuery({
      packId: 'kp-system-et',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/kp-system-et',
      method: 'DELETE',
    })

    expect(buildDeprecateOutcomeKnowledgePackVersionQuery({
      packId: 'truth-certification-pack',
      versionId: 'truth-certification-pack@1.0.1',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/versions/truth-certification-pack%401.0.1/deprecate',
      method: 'POST',
      body: {},
    })

    expect(buildDisableOutcomeKnowledgePackVersionQuery({
      packId: 'truth-certification-pack',
      versionId: 'truth-certification-pack@1.0.1',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/versions/truth-certification-pack%401.0.1/disable',
      method: 'POST',
      body: {},
    })

    expect(buildRollbackOutcomeKnowledgePackQuery({
      packId: 'truth-certification-pack',
      versionId: 'truth-certification-pack@1.0.0',
      rollbackReason: 'Restore governed schema.',
      scopeType: 'global',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/rollback',
      method: 'POST',
      body: {
        versionId: 'truth-certification-pack@1.0.0',
        rollbackReason: 'Restore governed schema.',
        scopeType: 'GLOBAL',
      },
    })
  })

  it('builds manifest list, detail, preview, and compare requests', () => {
    expect(buildOutcomeKnowledgePackManifestListQuery({
      q: 'vmf',
      status: 'ACTIVE',
      frameworkKey: 'VMF',
      packageKey: 'standard-package-vmf-3-1-rkm',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/manifests',
      params: {
        page: 1,
        pageSize: 100,
        q: 'vmf',
        status: 'ACTIVE',
        frameworkKey: 'VMF',
        packageKey: 'standard-package-vmf-3-1-rkm',
      },
    })

    expect(buildOutcomeKnowledgePackManifestDetailQuery({
      manifestId: 'kpm-vmf-outcome-studio@1',
    })).toBe('/super-admin/outcome-studio/knowledge-packs/manifests/kpm-vmf-outcome-studio%401')

    expect(buildPreviewOutcomeKnowledgePackManifestResolutionQuery({
      manifestId: 'kpm-vmf-outcome-studio',
      frameworkKey: 'VMF',
      runtimeType: 'VALUE_NARRATIVE',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/manifests/kpm-vmf-outcome-studio/resolution-preview',
      params: {
        frameworkKey: 'VMF',
        runtimeType: 'VALUE_NARRATIVE',
      },
    })

    expect(buildPreviewOutcomeKnowledgePackReasoningContextQuery({
      manifestId: 'kpm-vmf-outcome-studio',
      outputKey: 'executive_brief',
      contextCategories: ['style', 'audience', '', 'decision'],
      frameworkKey: 'VMF',
      runtimeType: 'VALUE_NARRATIVE',
      tenantId: '507f1f77bcf86cd799439012',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/manifests/kpm-vmf-outcome-studio/reasoning-context-preview',
      params: {
        outputKey: 'executive_brief',
        contextCategories: 'STYLE,AUDIENCE,DECISION',
        frameworkKey: 'VMF',
        runtimeType: 'VALUE_NARRATIVE',
        tenantId: '507f1f77bcf86cd799439012',
      },
    })

    expect(buildCompareOutcomeKnowledgePackManifestsQuery({
      manifestId: 'kpm-vmf-outcome-studio-1-0-0-global',
      targetManifestId: 'kpm-vmf-outcome-studio-1-1-0-global',
    })).toBe(
      '/super-admin/outcome-studio/knowledge-packs/manifests/kpm-vmf-outcome-studio-1-0-0-global/compare/kpm-vmf-outcome-studio-1-1-0-global',
    )
  })

  it('builds manifest create, update, and clone mutation requests', () => {
    const manifestBody = {
      manifestKey: 'vmf-outcome-studio',
      manifestName: 'VMF Outcome Studio',
      semanticVersion: '1.0.0',
      frameworkKey: 'vmf',
      validationPacks: [
        {
          packCategory: 'platform',
          purposeCategory: 'validation',
          packType: 'truth_certification',
          packKey: 'truth-certification-pack',
          label: 'Truth Certification',
          executionMode: 'post_validation',
          dependencyKeys: ['adaptive-reasoning-layer', ''],
        },
      ],
    }

    expect(buildCreateOutcomeKnowledgePackManifestQuery(manifestBody)).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/manifests',
      method: 'POST',
      body: expect.objectContaining({
        manifestKey: 'vmf-outcome-studio',
        manifestName: 'VMF Outcome Studio',
        semanticVersion: '1.0.0',
        manifestType: 'FRAMEWORK_RUNTIME',
        workspaceType: 'OUTCOME',
        frameworkKey: 'VMF',
        scopeType: 'GLOBAL',
        validationPacks: [
          expect.objectContaining({
            packCategory: 'PLATFORM',
            purposeCategory: 'VALIDATION',
            packType: 'TRUTH_CERTIFICATION',
            packKey: 'truth-certification-pack',
            executionMode: 'POST_VALIDATION',
            dependencyKeys: ['adaptive-reasoning-layer'],
          }),
        ],
      }),
    })

    expect(buildUpdateOutcomeKnowledgePackManifestQuery({
      manifestId: 'kpm-vmf-outcome-studio-1-0-0-global',
      manifestKey: 'ignored-on-update',
      semanticVersion: '9.9.9',
      manifestName: 'VMF Outcome Studio Updated',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/manifests/kpm-vmf-outcome-studio-1-0-0-global',
      method: 'PUT',
      body: expect.not.objectContaining({
        manifestKey: expect.anything(),
        semanticVersion: expect.anything(),
      }),
    })

    expect(buildCloneOutcomeKnowledgePackManifestQuery({
      manifestId: 'kpm-vmf-outcome-studio-1-0-0-global',
      manifestKey: 'vmf-outcome-studio-copy',
      manifestName: 'VMF Outcome Studio Copy',
      semanticVersion: '1.1.0',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/manifests/kpm-vmf-outcome-studio-1-0-0-global/clone',
      method: 'POST',
      body: expect.objectContaining({
        manifestKey: 'vmf-outcome-studio-copy',
        manifestName: 'VMF Outcome Studio Copy',
        semanticVersion: '1.1.0',
      }),
    })
  })
})
