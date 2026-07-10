import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  KNOWLEDGE_PACK_EXECUTION_MODE_OPTIONS,
  KNOWLEDGE_PACK_PURPOSE_CATEGORY_OPTIONS,
  KNOWLEDGE_PACK_REVIEW_STATUS_OPTIONS,
  KNOWLEDGE_PACK_VISIBILITY_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_SOURCE_FORMAT_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_STATUSES,
  OUTCOME_KNOWLEDGE_PACK_STATUS_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_TYPES,
} from './superAdminOutcomeKnowledgePacks.constants.js'

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

const optionValues = (options = []) =>
  options
    .map((option) => option.value)
    .filter(Boolean)

const sortValues = (values = []) => [...values].sort((left, right) => left.localeCompare(right))

function loadBackendKnowledgePackConstants() {
  const script = `
    const outcome = await import(${JSON.stringify(pathToFileURL(outcomeKnowledgePacksConstantsPath).href)});
    const runtime = await import(${JSON.stringify(pathToFileURL(knowledgeRuntimeConstantsPath).href)});
    process.stdout.write(JSON.stringify({
      contentFormats: outcome.OUTCOME_KNOWLEDGE_PACK_CONTENT_FORMATS,
      statuses: outcome.OUTCOME_KNOWLEDGE_PACK_STATUSES,
      types: outcome.OUTCOME_KNOWLEDGE_PACK_TYPES,
      executionModes: runtime.KNOWLEDGE_PACK_EXECUTION_MODES,
      purposeCategories: runtime.KNOWLEDGE_PACK_PURPOSE_CATEGORIES,
      reviewStatuses: runtime.KNOWLEDGE_PACK_REVIEW_STATUSES,
      visibilityScopes: runtime.KNOWLEDGE_PACK_VISIBILITY_SCOPES,
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
    expect(sortValues(optionValues(KNOWLEDGE_PACK_VISIBILITY_OPTIONS))).toEqual(
      sortValues(Object.values(backend.visibilityScopes)),
    )
    expect(sortValues(optionValues(KNOWLEDGE_PACK_REVIEW_STATUS_OPTIONS))).toEqual(
      sortValues(Object.values(backend.reviewStatuses)),
    )
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
