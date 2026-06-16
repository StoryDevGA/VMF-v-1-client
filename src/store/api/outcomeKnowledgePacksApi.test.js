import { describe, expect, it } from 'vitest'
import {
  buildActivateOutcomeKnowledgePackVersionQuery,
  buildCreateOutcomeKnowledgePackVersionQuery,
  buildDeprecateOutcomeKnowledgePackVersionQuery,
  buildDisableOutcomeKnowledgePackVersionQuery,
  buildImportOutcomeKnowledgePackStarterVersionQuery,
  buildOutcomeKnowledgePackDetailQuery,
  buildOutcomeKnowledgePackListQuery,
  buildOutcomeKnowledgePackVersionQuery,
  buildPreviewOutcomeKnowledgePackVersionContentQuery,
  buildPreviewOutcomeKnowledgePackResolutionQuery,
  buildRollbackOutcomeKnowledgePackQuery,
  buildValidateOutcomeKnowledgePackVersionQuery,
  outcomeKnowledgePacksApi,
  useActivateOutcomeKnowledgePackVersionMutation,
  useCreateOutcomeKnowledgePackVersionMutation,
  useDeprecateOutcomeKnowledgePackVersionMutation,
  useDisableOutcomeKnowledgePackVersionMutation,
  useGetOutcomeKnowledgePackQuery,
  useGetOutcomeKnowledgePackVersionQuery,
  useImportOutcomeKnowledgePackStarterVersionMutation,
  useLazyPreviewOutcomeKnowledgePackVersionContentQuery,
  useListOutcomeKnowledgePacksQuery,
  usePreviewOutcomeKnowledgePackResolutionQuery,
  useRollbackOutcomeKnowledgePackMutation,
  useValidateOutcomeKnowledgePackVersionMutation,
} from './outcomeKnowledgePacksApi.js'

describe('outcomeKnowledgePacksApi', () => {
  it('registers expected endpoint definitions', () => {
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('listOutcomeKnowledgePacks')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('getOutcomeKnowledgePack')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('getOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('previewOutcomeKnowledgePackVersionContent')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('createOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('importOutcomeKnowledgePackStarterVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('validateOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('activateOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('deprecateOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('disableOutcomeKnowledgePackVersion')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('rollbackOutcomeKnowledgePack')
    expect(outcomeKnowledgePacksApi.endpoints).toHaveProperty('previewOutcomeKnowledgePackResolution')
  })

  it('exports query and mutation hooks', () => {
    expect(typeof useListOutcomeKnowledgePacksQuery).toBe('function')
    expect(typeof useGetOutcomeKnowledgePackQuery).toBe('function')
    expect(typeof useGetOutcomeKnowledgePackVersionQuery).toBe('function')
    expect(typeof useLazyPreviewOutcomeKnowledgePackVersionContentQuery).toBe('function')
    expect(typeof useCreateOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useImportOutcomeKnowledgePackStarterVersionMutation).toBe('function')
    expect(typeof useValidateOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useActivateOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useDeprecateOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useDisableOutcomeKnowledgePackVersionMutation).toBe('function')
    expect(typeof useRollbackOutcomeKnowledgePackMutation).toBe('function')
    expect(typeof usePreviewOutcomeKnowledgePackResolutionQuery).toBe('function')
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
      content: 'starter content',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/versions',
      method: 'POST',
      body: {
        semanticVersion: '1.0.1',
        schemaVersion: '1.0.0',
        contentFormat: 'YAML',
        sourceFilename: 'truth-certification-pack-v1.yaml',
        content: 'starter content',
      },
    })

    expect(buildImportOutcomeKnowledgePackStarterVersionQuery({
      packId: 'truth-certification-pack',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/starter-import',
      method: 'POST',
      body: {},
    })

    expect(buildValidateOutcomeKnowledgePackVersionQuery({
      packId: 'truth-certification-pack',
      versionId: 'truth-certification-pack@1.0.1',
    })).toEqual({
      url: '/super-admin/outcome-studio/knowledge-packs/truth-certification-pack/versions/truth-certification-pack%401.0.1/validate',
      method: 'POST',
      body: {},
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
})
