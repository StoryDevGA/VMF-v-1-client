import { getHubDestinationHref, getHubPayload, validateHubContext } from '../IntelligenceHub/intelligenceHubModel.js'
import { writeGraphInspection } from '../IntelligenceHub/intelligenceGraphModel.js'
import { isDiscoveryAcceptanceUnlocked } from '../IntelligenceHub/discoveryAcceptanceModel.js'

const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const text = value => typeof value === 'string' ? value.trim() : ''
export const understandingContent = value => typeof value?.content === 'string' ? value.content : ''
export function understandingLineageHref(basis, scope = {}) {
  if (!basis?.acceptedCurrent || !validateHubContext({ renderer: basis.renderer, ...scope, revisionId: scope.runtimeInstanceId }).valid) return ''
  const runtimeKey = basis.renderer.runtimeInstance.runtimeInstanceKey
  const sectionKey = basis.section?.sectionKey, truthHash = basis.accepted?.truthHash
  // Existing producer identity: canonical runtime key, declared package section key, accepted truth hash.
  // Reject noncanonical identities rather than guessing a slug or substituting another object.
  const canonicalKey = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  if (!canonicalKey(runtimeKey) || !canonicalKey(sectionKey) || typeof truthHash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(truthHash)) return ''
  const selectedKey = `section-truth:${runtimeKey}:${sectionKey}:${truthHash.replace(':', '-')}`
  if (selectedKey.length > 240) return ''
  const [path, search] = getHubDestinationHref('intelligence', scope.workspaceId, scope.runtimeInstanceId).split('?')
  const params = new URLSearchParams(search)
  params.set('view', 'intelligence-graph')
  const contextKey = `${scope.workspaceId}:${scope.runtimeInstanceId}:${scope.customerId}:${scope.tenantId}`
  return `${path}?${writeGraphInspection(params, contextKey, { mode: 'Lineage', objectView: 'object', selectedKey })}`
}
// Reuse the existing plain-context summary envelope for declared OBJECT paths.
export function sectionContextText(section, input) {
  if (section?.control === 'JSON' && section.dataType === 'OBJECT')
    return input == null ? '' : object(input) && Object.hasOwn(input, 'summary') && typeof input.summary === 'string' ? input.summary : null
  if (['TEXT', 'TEXTAREA'].includes(section?.control) && section.dataType === 'STRING')
    return input == null ? '' : typeof input === 'string' ? input : null
  return null
}
export const sectionContextValue = (section, input, value) => section.dataType === 'OBJECT' ? { ...(input || {}), summary: value.trim() } : value
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
export const sameSectionInput = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
const sameControl = (control, runtime) => object(control) && ['id', 'runtimeInstanceKey', 'customerId', 'tenantId', 'packageId', 'packageKey', 'packageVersion', 'stateVersion']
  .every(key => text(control[key]) && control[key] === runtime[key])

// The package mutation key and the exact native storage key are different contracts.
export function readUnderstandingCatalogue(rendererResponse, bootstrapResponse, scope) {
  const renderer = getHubPayload(rendererResponse), bootstrap = getHubPayload(bootstrapResponse)
  if (!validateHubContext({ renderer, workspaceId: scope.workspaceId, revisionId: scope.runtimeInstanceId, ...scope }).valid
    || renderer.sectionStateSource !== 'runtime_state_v2' || !sameControl(bootstrap?.control, renderer.runtimeInstance)
    || !Array.isArray(renderer.sections) || !Array.isArray(bootstrap.sections)
    || !text(renderer.runtimeInstance.updatedAt) || !Number.isFinite(Date.parse(renderer.runtimeInstance.updatedAt))) return null
  const rows = renderer.sections
  const keys = rows.map(row => row?.sectionKey), paths = rows.map(row => row?.runtimePath)
  if (keys.some(key => !text(key)) || new Set(keys).size !== keys.length || new Set(paths).size !== paths.length) return null
  const sections = []
  for (const row of rows) {
    const match = /^framework_state\.sections\.([a-zA-Z0-9_]+)$/.exec(row.runtimePath || '')
    if (!match) return null
    const nativeKey = match[1]
    const native = bootstrap.sections.filter(item => item?.sectionKey === nativeKey)
    if (native.length !== 1 || native[0].stateVersion !== renderer.runtimeInstance.stateVersion
      || native[0].sourceStateVersion !== renderer.runtimeInstance.stateVersion) return null
    if (row.visible === true) sections.push({ ...row, nativeKey })
  }
  return { renderer, bootstrap, sections }
}

export function readUnderstandingBasis(catalogue, sectionResponse, sectionKey, canUpdate) {
  if (!catalogue) return null
  const section = catalogue.sections.find(row => row.sectionKey === sectionKey)
  const payload = getHubPayload(sectionResponse), native = payload?.section
  const runtime = catalogue.renderer.runtimeInstance
  if (!section || !sameControl(payload?.control, runtime) || !object(native?.sectionDetail)
    || native.sectionKey !== section.nativeKey || native.stateVersion !== runtime.stateVersion
    || native.sourceStateVersion !== runtime.stateVersion
    || (text(native.projectionReceipt?.sourceStateVersion) && native.projectionReceipt.sourceStateVersion !== runtime.stateVersion)
    || native.sectionDetail.lineage?.runtimePath !== section.runtimePath
    || ![section.sectionKey, section.nativeKey].includes(native.sectionDetail.lineage?.sectionKey)) return null
  const detail = native.sectionDetail
  const unlocked = isDiscoveryAcceptanceUnlocked(catalogue.renderer)
    && ['DRAFT', 'READY', 'IN_REVIEW'].includes(catalogue.renderer.lifecycle?.stage)
  const editable = canUpdate === true && section.editable === true && unlocked
  const generated = detail.generated, accepted = detail.accepted
  const generatedReady = Boolean(understandingContent(generated).trim() && text(generated?.generatedAt)
    && Number.isFinite(Date.parse(generated.generatedAt)) && text(generated.inputHash))
  const stale = detail.state?.needsRegeneration === true || detail.intelligence?.readiness?.state === 'REGENERATION_REQUIRED'
    || detail.dependencies?.state === 'DEPENDENCY_CONTEXT_INVALIDATED'
    || detail.intelligence?.dependency?.state === 'DEPENDENCY_CONTEXT_INVALIDATED'
  const acceptedCurrent = Boolean(generatedReady && understandingContent(accepted) === understandingContent(generated)
    && accepted.sourceGeneratedAt === generated.generatedAt && accepted.inputHash === generated.inputHash
    && text(accepted.truthHash) && text(accepted.acceptedBy) && Number.isFinite(Date.parse(accepted.acceptedAt))
    && detail.state?.status === 'ACCEPTED' && !stale)
  const eligibility = generated?.truthEligibility || detail.intelligence?.truthEligibility
  const acceptanceReason = !editable ? section.readonlyReason || 'This revision or your current authority permits inspection only.'
    : !generatedReady ? 'Generate this section before accepting Understanding.'
      : eligibility?.eligible !== true ? 'Positive generated-content eligibility is unavailable or blocked. Inspect the generation basis.'
        : stale ? 'The generated Understanding requires regeneration before acceptance.'
          : acceptedCurrent ? 'The current generated Understanding is already accepted.' : ''
  const actionReason = key => {
    if (!editable) return section.readonlyReason || 'This revision or your current authority permits inspection only.'
    const matches = catalogue.renderer.actions?.filter(action => action?.actionKey === key || action?.governedAction === key)
    if (!Array.isArray(matches) || matches.length !== 1 || matches[0].actionKey !== key || matches[0].governedAction !== key
      || matches[0].enabled !== true) return matches?.[0]?.disabledReason || 'The package action is unavailable.'
    if (section.generationEligibility?.canGenerate !== true || catalogue.renderer.discovery?.accepted !== true)
      return section.generationEligibility?.reason || 'The current evidence and section generation basis is not eligible.'
    if (key === 'GENERATE_SECTION' && (generatedReady || detail.revisions?.some(row => understandingContent(row.generated).trim())))
      return 'Use Regenerate for an existing generation baseline.'
    if (key === 'REGENERATE_SECTION' && !generatedReady && !detail.revisions?.some(row => understandingContent(row.generated).trim()))
      return 'Generate this section before regenerating it.'
    return ''
  }
  return { ...catalogue, section, detail, generated, accepted, acceptedCurrent, editable, acceptanceReason, actionReason,
    expectedUpdatedAt: runtime.updatedAt,
    signature: JSON.stringify([runtime.id, runtime.stateVersion, runtime.updatedAt, section.sectionKey, section.runtimePath, canUpdate,
      unlocked, section.control, section.dataType, section.allowedOperations, detail.input, generated, accepted, detail.state, detail.dependencies, detail.intelligence, catalogue.renderer.actions, section.generationEligibility]) }
}
