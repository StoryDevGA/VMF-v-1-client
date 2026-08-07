import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  KNOWLEDGE_PACK_EXECUTION_MODE_OPTIONS,
  KNOWLEDGE_PACK_LAYER_FILTER_OPTIONS,
  KNOWLEDGE_PACK_LAYER_OPTIONS,
  KNOWLEDGE_PACK_PURPOSE_CATEGORY_OPTIONS,
  KNOWLEDGE_PACK_REVIEW_STATUS_OPTIONS,
  KNOWLEDGE_PACK_VISIBILITY_OPTIONS,
  KNOWLEDGE_PACK_WORKSPACE_COMPATIBILITY_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_AUTHORING_TYPE_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_SOURCE_FORMAT_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_STATUSES,
  OUTCOME_KNOWLEDGE_PACK_STATUS_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_TYPES,
  SOURCE_DOCUMENT_MAX_BYTES,
  SOURCE_IMPORT_KNOWLEDGE_ASSET_ID_PATTERN_SOURCE,
  formatKnowledgePackType,
} from './superAdminOutcomeKnowledgePacks.constants.js'
import {
  OUTCOME_KNOWLEDGE_PACK_RELATIONSHIP_CONTRACT_VERSION,
} from '../../store/api/outcomeKnowledgePacksApi.js'

const currentFilePath = fileURLToPath(import.meta.url)
const workspaceRoot = path.resolve(path.dirname(currentFilePath), '../../../..')
const outcomeKnowledgePacksConstantsPath = path.join(
  workspaceRoot,
  'VMF-v-1-api/src/constants/outcomeKnowledgePacks.js',
)
const knowledgeRuntimeConstantsPath = path.join(
  workspaceRoot,
  'VMF-v-1-api/src/constants/knowledgeRuntime.js',
)
const workspaceGovernanceConstantsPath = path.join(
  workspaceRoot,
  'VMF-v-1-api/src/constants/workspaceGovernance.js',
)
const sourceDocumentExtractionServicePath = path.join(
  workspaceRoot,
  'VMF-v-1-api/src/services/knowledgePackSourceDocumentExtractionService.js',
)

const optionValues = (options = []) =>
  options
    .map((option) => option.value)
    .filter(Boolean)

const sortValues = (values = []) => [...values].sort((left, right) => left.localeCompare(right))

const SS003_CANONICAL_PACK_TYPES = Object.freeze([
  'ARL',
  'RL',
  'ET',
  'ET_RUNTIME',
  'ERR',
  'RGS',
  'OBSERVATION_REGISTER',
  'CCD',
  'CCR',
  'DIAGNOSTIC_EXTENSION',
  'VALIDATION_EVIDENCE',
  'CONTRADICTION_REGISTER',
  'CDRM',
  'CDRT',
  'FRAMEWORK_METADATA',
  'FRAMEWORK_PACK',
  'SYSTEM_REFERENCE',
  'OUTPUT_SCHEMA',
  'TRUTH_CERTIFICATION',
  'OUTPUT_TYPE_DEFINITION',
  'STYLE',
  'AUDIENCE',
  'INDUSTRY',
  'LANGUAGE',
  'BRAND',
  'COMPLIANCE',
  'DECISION',
  'ADVISOR',
  'DOMAIN',
  'SYSTEM',
  'CHANNEL',
  'COMMUNICATION_PATTERN',
  'VISUAL_SYSTEM',
  'TRANSFORMATION',
  'TEMPLATE',
  'CATALOGUE',
  'CAPABILITY',
  'PROCESS',
  'ASSESSMENT_MODEL',
  'SCORING_MODEL',
  'QUESTION_LIBRARY',
  'FINDING_LIBRARY',
  'RECOMMENDATION_LIBRARY',
  'RISK_LIBRARY',
  'METRIC_LIBRARY',
  'TERMINOLOGY',
  'REFERENCE_DATA',
  'RULE_SET',
  'POLICY_DEFINITION',
  'GOVERNANCE_STANDARD',
  'QUALITY_STANDARD',
  'OUTPUT_TEMPLATE',
  'OUTPUT_PATTERN',
])

const SS003_LEGACY_PACK_TYPE_ALIASES = Object.freeze([
  ['ET_RT', 'ET Runtime (legacy)'],
  ['OR', 'Observation Register (legacy)'],
  ['DX', 'Diagnostic Extension (legacy)'],
  ['VE', 'Validation Evidence (legacy)'],
  ['CR', 'Contradiction Register (legacy)'],
])

const SS003_PURPOSE_CATEGORIES = Object.freeze([
  'SYSTEM',
  'GOVERNANCE',
  'OUTPUT',
  'FRAMEWORK',
  'DOMAIN',
  'VALIDATION',
  'STYLE',
  'AUDIENCE',
  'INDUSTRY',
  'LANGUAGE',
  'BRAND',
  'COMPLIANCE',
  'DECISION',
  'ADVISOR',
  'CHANNEL',
  'COMMUNICATIONS',
  'VISUAL',
  'TRANSFORMATION',
  'CAPABILITY',
  'PROCESS',
  'ASSESSMENT',
  'REFERENCE',
])

function loadBackendKnowledgePackConstants() {
  const script = `
    const outcome = await import(${JSON.stringify(pathToFileURL(outcomeKnowledgePacksConstantsPath).href)});
    const runtime = await import(${JSON.stringify(pathToFileURL(knowledgeRuntimeConstantsPath).href)});
    const workspaceGovernance = await import(${JSON.stringify(pathToFileURL(workspaceGovernanceConstantsPath).href)});
    const sourceDocuments = await import(${JSON.stringify(pathToFileURL(sourceDocumentExtractionServicePath).href)});
    process.stdout.write(JSON.stringify({
      assetIdPatternSource: runtime.KNOWLEDGE_ASSET_ID_PATTERN_SOURCE,
      contentFormats: outcome.OUTCOME_KNOWLEDGE_PACK_CONTENT_FORMATS,
      statuses: outcome.OUTCOME_KNOWLEDGE_PACK_STATUSES,
      types: outcome.OUTCOME_KNOWLEDGE_PACK_TYPES,
      executionModes: runtime.KNOWLEDGE_PACK_EXECUTION_MODES,
      knowledgeLayers: runtime.KNOWLEDGE_PACK_LAYERS,
      purposeCategories: runtime.KNOWLEDGE_PACK_PURPOSE_CATEGORIES,
      reviewStatuses: runtime.KNOWLEDGE_PACK_REVIEW_STATUSES,
      relationshipContractVersion: runtime.KNOWLEDGE_PACK_RELATIONSHIP_CONTRACT_VERSION,
      sourceDocumentMaxBytes: sourceDocuments.SOURCE_DOCUMENT_IMPORT_LIMITS.maxSourceDocumentBytes,
      visibilityScopes: runtime.KNOWLEDGE_PACK_VISIBILITY_SCOPES,
      workspaceTypes: workspaceGovernance.WORKSPACE_TYPES,
    }));
  `

  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  }))
}

describe('superAdminOutcomeKnowledgePacks constants', () => {
  it('keeps pack type and persisted status constants aligned with the API contract', () => {
    const backend = loadBackendKnowledgePackConstants()
    const clientOnlyStatuses = ['MISSING']

    expect(OUTCOME_KNOWLEDGE_PACK_TYPES).toEqual(backend.types)
    expect(sortValues(Object.values(OUTCOME_KNOWLEDGE_PACK_STATUSES))).toEqual(
      sortValues([...Object.values(backend.statuses), ...clientOnlyStatuses]),
    )
    expect(sortValues(optionValues(OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS))).toEqual(
      sortValues(Object.values(backend.types)),
    )
  })

  it('keeps authoring option values aligned with backend runtime knowledge enums', () => {
    const backend = loadBackendKnowledgePackConstants()

    expect(sortValues(optionValues(OUTCOME_KNOWLEDGE_PACK_SOURCE_FORMAT_OPTIONS))).toEqual(
      sortValues(Object.values(backend.contentFormats)),
    )
    expect(sortValues(optionValues(KNOWLEDGE_PACK_PURPOSE_CATEGORY_OPTIONS))).toEqual(
      sortValues(Object.values(backend.purposeCategories)),
    )
    expect(sortValues(optionValues(KNOWLEDGE_PACK_EXECUTION_MODE_OPTIONS))).toEqual(
      sortValues(Object.values(backend.executionModes)),
    )
    expect(sortValues(optionValues(KNOWLEDGE_PACK_LAYER_OPTIONS))).toEqual(
      sortValues(Object.values(backend.knowledgeLayers)),
    )
    expect(sortValues(optionValues(KNOWLEDGE_PACK_LAYER_FILTER_OPTIONS))).toEqual(
      sortValues(Object.values(backend.knowledgeLayers)),
    )
    expect(sortValues(optionValues(KNOWLEDGE_PACK_WORKSPACE_COMPATIBILITY_OPTIONS))).toEqual(
      sortValues(Object.values(backend.workspaceTypes)),
    )
    expect(sortValues(optionValues(KNOWLEDGE_PACK_VISIBILITY_OPTIONS))).toEqual(
      sortValues(Object.values(backend.visibilityScopes)),
    )
    expect(sortValues(optionValues(KNOWLEDGE_PACK_REVIEW_STATUS_OPTIONS))).toEqual(
      sortValues(Object.values(backend.reviewStatuses)),
    )
    expect(OUTCOME_KNOWLEDGE_PACK_RELATIONSHIP_CONTRACT_VERSION)
      .toBe(backend.relationshipContractVersion)
    expect(SOURCE_IMPORT_KNOWLEDGE_ASSET_ID_PATTERN_SOURCE).toBe(backend.assetIdPatternSource)
    expect(SOURCE_DOCUMENT_MAX_BYTES).toBe(backend.sourceDocumentMaxBytes)
  })

  it('exposes the SS-003 canonical catalogues while preserving legacy alias labels', () => {
    expect(optionValues(OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS))
      .toEqual(expect.arrayContaining(SS003_CANONICAL_PACK_TYPES))
    expect(optionValues(KNOWLEDGE_PACK_PURPOSE_CATEGORY_OPTIONS))
      .toEqual(expect.arrayContaining(SS003_PURPOSE_CATEGORIES))

    SS003_LEGACY_PACK_TYPE_ALIASES.forEach(([value, label]) => {
      expect(optionValues(OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS)).toContain(value)
      expect(formatKnowledgePackType(value)).toBe(label)
    })
  })

  it('excludes legacy pack aliases from source-document authoring options', () => {
    expect(optionValues(OUTCOME_KNOWLEDGE_PACK_AUTHORING_TYPE_OPTIONS))
      .toEqual(expect.arrayContaining(SS003_CANONICAL_PACK_TYPES))

    SS003_LEGACY_PACK_TYPE_ALIASES.forEach(([value]) => {
      expect(optionValues(OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS)).toContain(value)
      expect(optionValues(OUTCOME_KNOWLEDGE_PACK_AUTHORING_TYPE_OPTIONS)).not.toContain(value)
    })
  })

  it('keeps the visible status filter intentionally scoped to searchable registry states', () => {
    expect(optionValues(OUTCOME_KNOWLEDGE_PACK_STATUS_OPTIONS)).toEqual([
      OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE,
      OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATED,
      OUTCOME_KNOWLEDGE_PACK_STATUSES.DRAFT,
      OUTCOME_KNOWLEDGE_PACK_STATUSES.FAILED_VALIDATION,
      OUTCOME_KNOWLEDGE_PACK_STATUSES.DISABLED,
      OUTCOME_KNOWLEDGE_PACK_STATUSES.DEPRECATED,
    ])
  })
})
