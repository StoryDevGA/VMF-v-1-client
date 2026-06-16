export const OUTCOME_KNOWLEDGE_PACK_PAGE_SIZE = 100

export const OUTCOME_KNOWLEDGE_PACK_TYPES = Object.freeze({
  ARL: 'ARL',
  RL: 'RL',
  OUTPUT_SCHEMA: 'OUTPUT_SCHEMA',
  TRUTH_CERTIFICATION: 'TRUTH_CERTIFICATION',
  OUTPUT_TYPE_DEFINITION: 'OUTPUT_TYPE_DEFINITION',
})

export const OUTCOME_KNOWLEDGE_PACK_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  VALIDATING: 'VALIDATING',
  VALIDATED: 'VALIDATED',
  ACTIVE: 'ACTIVE',
  DEPRECATED: 'DEPRECATED',
  DISABLED: 'DISABLED',
  FAILED_VALIDATION: 'FAILED_VALIDATION',
  ROLLED_BACK: 'ROLLED_BACK',
  SOURCE_ONLY: 'SOURCE_ONLY',
  MISSING: 'MISSING',
})

export const REQUIRED_OUTCOME_KNOWLEDGE_PACKS = Object.freeze([
  Object.freeze({
    packType: OUTCOME_KNOWLEDGE_PACK_TYPES.ARL,
    packKey: 'adaptive-reasoning-layer',
    label: 'Adaptive Reasoning Layer',
    sourceStatus: OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY,
    sourceFilename: 'adaptive-reasoning-layer-v1.yaml',
  }),
  Object.freeze({
    packType: OUTCOME_KNOWLEDGE_PACK_TYPES.RL,
    packKey: 'rendering-layer',
    label: 'Rendering Layer',
    sourceStatus: OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY,
    sourceFilename: 'rendering-layer-v1.yaml',
  }),
  Object.freeze({
    packType: OUTCOME_KNOWLEDGE_PACK_TYPES.OUTPUT_SCHEMA,
    packKey: 'output-schemas-pack',
    label: 'Output Schemas',
    sourceStatus: OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY,
    sourceFilename: 'output-schemas-pack-v1.yaml',
  }),
  Object.freeze({
    packType: OUTCOME_KNOWLEDGE_PACK_TYPES.TRUTH_CERTIFICATION,
    packKey: 'truth-certification-pack',
    label: 'Truth Certification',
    sourceStatus: OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY,
    sourceFilename: 'truth-certification-pack-v1.yaml',
  }),
  Object.freeze({
    packType: OUTCOME_KNOWLEDGE_PACK_TYPES.OUTPUT_TYPE_DEFINITION,
    packKey: 'outcome-output-types',
    label: 'Outcome Output Types',
    sourceStatus: OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY,
    sourceFilename: 'outcome-output-types-v1.yaml',
  }),
])

const TYPE_LABELS = Object.freeze({
  [OUTCOME_KNOWLEDGE_PACK_TYPES.ARL]: 'ARL',
  [OUTCOME_KNOWLEDGE_PACK_TYPES.RL]: 'RL',
  [OUTCOME_KNOWLEDGE_PACK_TYPES.OUTPUT_SCHEMA]: 'Output Schema',
  [OUTCOME_KNOWLEDGE_PACK_TYPES.TRUTH_CERTIFICATION]: 'Truth Certification',
  [OUTCOME_KNOWLEDGE_PACK_TYPES.OUTPUT_TYPE_DEFINITION]: 'Output Type Definition',
})

const STATUS_LABELS = Object.freeze({
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.DRAFT]: 'Draft',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATING]: 'Validating',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATED]: 'Validated',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE]: 'Active',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.DEPRECATED]: 'Deprecated',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.DISABLED]: 'Disabled',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.FAILED_VALIDATION]: 'Failed validation',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.ROLLED_BACK]: 'Rolled back',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY]: 'Source only',
  [OUTCOME_KNOWLEDGE_PACK_STATUSES.MISSING]: 'Missing',
})

export const OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: '', label: 'All pack types' }),
  ...Object.values(OUTCOME_KNOWLEDGE_PACK_TYPES).map((value) =>
    Object.freeze({ value, label: TYPE_LABELS[value] ?? value }),
  ),
])

export const OUTCOME_KNOWLEDGE_PACK_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: '', label: 'All statuses' }),
  ...[
    OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE,
    OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATED,
    OUTCOME_KNOWLEDGE_PACK_STATUSES.DRAFT,
    OUTCOME_KNOWLEDGE_PACK_STATUSES.FAILED_VALIDATION,
    OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY,
    OUTCOME_KNOWLEDGE_PACK_STATUSES.MISSING,
    OUTCOME_KNOWLEDGE_PACK_STATUSES.DISABLED,
    OUTCOME_KNOWLEDGE_PACK_STATUSES.DEPRECATED,
  ].map((value) => Object.freeze({ value, label: STATUS_LABELS[value] ?? value })),
])

export const EMPTY_KNOWLEDGE_PACK_UPLOAD_FORM = Object.freeze({
  semanticVersion: '1.0.0',
  schemaVersion: '1.0.0',
  sourceFilename: '',
  content: '',
})

const normalizeText = (value) => String(value ?? '').trim()
const normalizeToken = (value) => normalizeText(value).toUpperCase()
const normalizeLower = (value) => normalizeText(value).toLowerCase()

export const getOutcomeKnowledgePackKey = (pack = {}) =>
  `${normalizeToken(pack.packType)}:${normalizeLower(pack.packKey)}`

const SOURCE_BACKED_PACK_KEYS = new Set(
  REQUIRED_OUTCOME_KNOWLEDGE_PACKS
    .filter((pack) => pack.sourceStatus === OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY)
    .map(getOutcomeKnowledgePackKey),
)

const byPackKey = (packs = []) => new Map(
  packs
    .map((pack) => [getOutcomeKnowledgePackKey(pack), pack])
    .filter(([key]) => key !== ':'),
)

export function formatKnowledgePackType(value) {
  return TYPE_LABELS[normalizeToken(value)] ?? normalizeToken(value)
}

export function formatKnowledgePackStatus(value) {
  return STATUS_LABELS[normalizeToken(value)] ?? normalizeToken(value)
}

export function getKnowledgePackStatusVariant(status) {
  const normalized = normalizeToken(status)
  if (normalized === OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE) return 'success'
  if (normalized === OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATED) return 'info'
  if (
    normalized === OUTCOME_KNOWLEDGE_PACK_STATUSES.DRAFT
    || normalized === OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY
    || normalized === OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATING
  ) return 'warning'
  if (
    normalized === OUTCOME_KNOWLEDGE_PACK_STATUSES.FAILED_VALIDATION
    || normalized === OUTCOME_KNOWLEDGE_PACK_STATUSES.MISSING
  ) return 'danger'
  return 'neutral'
}

export function getRuntimeBindingLabel(row = {}) {
  if (row.runtimeBindable === true) return 'Runtime active'
  if (isSourceBackedKnowledgePack(row)) return 'Starter source only'
  return 'Source missing'
}

export function getRuntimeBindingVariant(row = {}) {
  if (row.runtimeBindable === true) return 'success'
  if (isSourceBackedKnowledgePack(row)) return 'warning'
  return 'danger'
}

export function isSourceBackedKnowledgePack(row = {}) {
  return Boolean(row.sourceFilename)
    || normalizeToken(row.sourceStatus) === OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY
    || SOURCE_BACKED_PACK_KEYS.has(getOutcomeKnowledgePackKey(row))
}

export function hasKnowledgePackVersion(row = {}) {
  return Boolean(normalizeText(row.latestVersionId || row.versionId))
}

export function canUploadKnowledgePack(row = {}) {
  return isSourceBackedKnowledgePack(row)
}

export function canImportKnowledgePackStarter(row = {}) {
  return isSourceBackedKnowledgePack(row) && !hasKnowledgePackVersion(row)
}

export function canValidateKnowledgePack(row = {}) {
  const status = normalizeToken(row.status)
  return isSourceBackedKnowledgePack(row)
    && hasKnowledgePackVersion(row)
    && status !== OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE
    && status !== OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATED
}

export function canActivateKnowledgePack(row = {}) {
  return isSourceBackedKnowledgePack(row)
    && hasKnowledgePackVersion(row)
    && normalizeToken(row.status) === OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATED
}

export function canDeprecateKnowledgePack(row = {}) {
  const status = normalizeToken(row.status)
  return isSourceBackedKnowledgePack(row)
    && hasKnowledgePackVersion(row)
    && (
      status === OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATED
      || status === OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE
    )
}

export function canDisableKnowledgePack(row = {}) {
  const status = normalizeToken(row.status)
  return isSourceBackedKnowledgePack(row)
    && hasKnowledgePackVersion(row)
    && status !== OUTCOME_KNOWLEDGE_PACK_STATUSES.DISABLED
    && status !== OUTCOME_KNOWLEDGE_PACK_STATUSES.MISSING
    && status !== OUTCOME_KNOWLEDGE_PACK_STATUSES.SOURCE_ONLY
}

export function canRollbackKnowledgePackVersion({ pack = {}, version = null, activations = [] } = {}) {
  if (!isSourceBackedKnowledgePack(pack) || !version?.versionId) return false

  const versionStatus = normalizeToken(version.status)
  if (
    versionStatus !== OUTCOME_KNOWLEDGE_PACK_STATUSES.VALIDATED
    && versionStatus !== OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE
  ) return false

  return activations.some((activation) =>
    normalizeToken(activation.status) === OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE
    && normalizeText(activation.versionId) !== normalizeText(version.versionId),
  )
}

const buildPersistedPackRow = (record, requiredPack, sourcePack) => {
  const status = normalizeToken(
    record?.status
      || sourcePack?.registryStatus
      || requiredPack?.status
      || sourcePack?.status
      || OUTCOME_KNOWLEDGE_PACK_STATUSES.MISSING,
  )
  const runtimeBindable = requiredPack?.runtimeBindable === true
  const sourceFilename = normalizeText(
    record?.sourceMetadata?.sourceFilename
      || requiredPack?.sourceFilename
      || sourcePack?.sourceFilename,
  )

  return {
    id: normalizeText(record?.id || record?.packId || requiredPack?.packKey || sourcePack?.packKey),
    packId: normalizeText(record?.packId || record?.id || requiredPack?.packId || ''),
    packType: normalizeToken(record?.packType || requiredPack?.packType || sourcePack?.packType),
    packKey: normalizeLower(record?.packKey || requiredPack?.packKey || sourcePack?.packKey),
    label: normalizeText(record?.label || requiredPack?.label || sourcePack?.label),
    description: normalizeText(record?.description),
    status,
    runtimeBindable,
    runtimeStatus: runtimeBindable ? OUTCOME_KNOWLEDGE_PACK_STATUSES.ACTIVE : status,
    sourceStatus: normalizeToken(
      record?.sourceMetadata?.sourceStatus
        || requiredPack?.sourceStatus
        || sourcePack?.sourceStatus
        || sourcePack?.status,
    ),
    importStatus: normalizeToken(sourcePack?.importStatus),
    sourceFilename,
    latestVersionId: normalizeText(
      record?.latestVersionId
        || sourcePack?.latestVersionId
        || requiredPack?.versionId,
    ),
    latestSemanticVersion: normalizeText(
      record?.latestSemanticVersion
        || sourcePack?.latestSemanticVersion
        || requiredPack?.semanticVersion,
    ),
    schemaVersion: normalizeText(requiredPack?.schemaVersion),
    contentHash: normalizeText(requiredPack?.contentHash),
    scopeType: normalizeToken(requiredPack?.scopeType),
    updatedAt: normalizeText(record?.updatedAt || requiredPack?.activatedAt),
    isPersisted: Boolean(record?.packId || record?.id),
  }
}

export function buildOutcomeKnowledgePackRows({
  registryPacks = [],
  requiredPacks = [],
  starterPacks = [],
} = {}) {
  const requiredRows = requiredPacks.length > 0
    ? requiredPacks
    : REQUIRED_OUTCOME_KNOWLEDGE_PACKS
  const registryByKey = byPackKey(registryPacks)
  const starterByKey = byPackKey(starterPacks)
  const requiredKeys = new Set(requiredRows.map(getOutcomeKnowledgePackKey))
  const rows = requiredRows.map((requiredPack) => {
    const key = getOutcomeKnowledgePackKey(requiredPack)
    return buildPersistedPackRow(
      registryByKey.get(key),
      requiredPack,
      starterByKey.get(key),
    )
  })

  const extraRows = registryPacks
    .filter((record) => !requiredKeys.has(getOutcomeKnowledgePackKey(record)))
    .map((record) => buildPersistedPackRow(record, null, null))

  return [...rows, ...extraRows]
}

export function filterOutcomeKnowledgePackRows(rows = [], {
  search = '',
  packType = '',
  status = '',
} = {}) {
  const query = normalizeLower(search)
  const normalizedPackType = normalizeToken(packType)
  const normalizedStatus = normalizeToken(status)

  return rows.filter((row) => {
    if (normalizedPackType && row.packType !== normalizedPackType) return false
    if (normalizedStatus && row.status !== normalizedStatus) return false
    if (!query) return true

    return [
      row.label,
      row.packKey,
      row.packType,
      row.description,
      row.sourceFilename,
    ]
      .map(normalizeLower)
      .some((value) => value.includes(query))
  })
}
