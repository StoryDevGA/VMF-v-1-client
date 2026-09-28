import { formatRuntimeTokenLabel } from '../../utils/runtimeWorkspace.js'

const asCount = (value) => (
  Number.isSafeInteger(value) && value >= 0 ? value : null
)

const getUnresolvedContradictions = (discoveryHealth = {}) => {
  const candidates = discoveryHealth.contradictionCandidates
  if (Array.isArray(candidates)) {
    return candidates.filter((candidate) => (
      String(candidate?.reviewStatus ?? '').trim().toUpperCase() !== 'NOT_CONTRADICTORY'
    ))
  }
  return null
}

export const buildAdvisorRecommendation = ({
  acceptedSectionCount = null,
  discoveryHealth = {},
  requiredSectionCount = null,
  requiredSections = [],
} = {}) => {
  const readiness = discoveryHealth?.readiness && typeof discoveryHealth.readiness === 'object'
    ? discoveryHealth.readiness
    : {}
  const unresolvedCandidates = getUnresolvedContradictions(discoveryHealth)
  const unresolvedCount = unresolvedCandidates
    ? unresolvedCandidates.length
    : asCount(readiness.unresolvedContradictionCount)
  const contradictionDomains = unresolvedCandidates
    ? Array.from(new Set(unresolvedCandidates.map((candidate) => (
        formatRuntimeTokenLabel(candidate?.domain, '')
      )).filter(Boolean)))
    : []

  if (unresolvedCount > 0) {
    const domainText = contradictionDomains.length > 0 ? contradictionDomains.join(', ') : 'Intelligence quality'
    const affectedCount = contradictionDomains.length
    return {
      kind: 'contradictions',
      title: 'Review ' + unresolvedCount + ' contradiction candidate' + (unresolvedCount === 1 ? '' : 's') + ' before progressing customer outputs.',
      summary: 'Resolve ' + domainText + ' findings to strengthen the evidence-backed understanding and downstream outcomes.',
      affectedLabel: affectedCount > 0
        ? affectedCount + ' intelligence domain' + (affectedCount === 1 ? '' : 's')
        : unresolvedCount + ' review finding' + (unresolvedCount === 1 ? '' : 's'),
      affectedItems: contradictionDomains,
      stateSummary: unresolvedCount + ' open contradiction candidate' + (unresolvedCount === 1 ? '' : 's'),
      stateDetail: domainText + ' findings remain unresolved in this revision.',
      impactSummary: acceptedSectionCount !== null && requiredSectionCount !== null
        ? acceptedSectionCount + ' of ' + requiredSectionCount + ' required sections accepted'
        : 'Understanding and outcomes may be affected',
      impactDetail: 'Review the findings before relying on downstream customer outcomes.',
      actionLabel: 'Review intelligence quality',
      actionHref: '/app/intelligence/quality',
      destinationLabel: 'Open Intelligence Quality',
    }
  }

  const pendingReviewCount = asCount(readiness.pendingReviewCount)
    ?? asCount(discoveryHealth.pendingReviewCount)
  if (pendingReviewCount > 0) {
    return {
      kind: 'pending-evidence',
      title: 'Review ' + pendingReviewCount + ' pending evidence item' + (pendingReviewCount === 1 ? '' : 's') + ' before progressing customer outputs.',
      summary: 'Pending evidence needs an authorised review in Intelligence Hub.',
      affectedLabel: pendingReviewCount + ' evidence item' + (pendingReviewCount === 1 ? '' : 's'),
      affectedItems: [],
      stateSummary: pendingReviewCount + ' pending evidence item' + (pendingReviewCount === 1 ? '' : 's'),
      stateDetail: 'These evidence items have not been accepted or rejected.',
      impactSummary: acceptedSectionCount !== null && requiredSectionCount !== null
        ? acceptedSectionCount + ' of ' + requiredSectionCount + ' required sections accepted'
        : 'Understanding and outcomes may be affected',
      impactDetail: 'Review evidence before relying on downstream customer outcomes.',
      actionLabel: 'Review Intelligence Hub evidence',
      actionHref: '/app/intelligence',
      destinationLabel: 'Open Intelligence Hub',
    }
  }

  const missingAreas = Array.isArray(discoveryHealth.missingAreas)
    ? Array.from(new Set(discoveryHealth.missingAreas.map((area) => formatRuntimeTokenLabel(area, '')).filter(Boolean)))
    : []
  if (missingAreas.length > 0) {
    return {
      kind: 'coverage',
      title: 'Strengthen evidence coverage before progressing customer outputs.',
      summary: 'The current intelligence summary reports ' + missingAreas.length + ' missing coverage area' + (missingAreas.length === 1 ? '' : 's') + ': ' + missingAreas.join(', ') + '.',
      affectedLabel: missingAreas.length + ' evidence area' + (missingAreas.length === 1 ? '' : 's'),
      affectedItems: missingAreas,
      stateSummary: missingAreas.length + ' missing coverage area' + (missingAreas.length === 1 ? '' : 's'),
      stateDetail: missingAreas.join(', '),
      impactSummary: 'Evidence coverage is incomplete',
      impactDetail: 'Add evidence in the areas listed before relying on the understanding.',
      actionLabel: 'Review Intelligence Hub',
      actionHref: '/app/intelligence',
      destinationLabel: 'Open Intelligence Hub',
    }
  }

  if (acceptedSectionCount !== null && requiredSectionCount !== null && acceptedSectionCount < requiredSectionCount) {
    const blockerKeys = new Set((readiness.sectionTruth?.blockers ?? [])
      .map((blocker) => String(blocker?.sectionKey ?? '').trim().toLowerCase())
      .filter(Boolean))
    const affectedItems = requiredSections
      .filter((section) => blockerKeys.has(String(section?.sectionKey ?? section?.key ?? '').trim().toLowerCase()))
      .map((section) => String(section?.label ?? section?.title ?? section?.sectionKey ?? section?.key ?? '').trim())
      .filter(Boolean)
    const affectedCount = affectedItems.length || requiredSectionCount - acceptedSectionCount
    return {
      kind: 'understanding',
      title: 'Complete required section understanding before progressing customer outputs.',
      summary: acceptedSectionCount + ' of ' + requiredSectionCount + ' required sections have accepted truth ready.',
      affectedLabel: affectedCount + ' workspace section' + (affectedCount === 1 ? '' : 's'),
      affectedItems,
      stateSummary: acceptedSectionCount + ' of ' + requiredSectionCount + ' required sections accepted',
      stateDetail: affectedItems.length > 0
        ? affectedItems.join(', ') + ' still need accepted truth.'
        : 'Required sections still need accepted truth.',
      impactSummary: 'Workspace understanding is incomplete',
      impactDetail: 'Complete required sections in the selected workspace revision.',
      actionLabel: 'Continue workspace structure',
      actionHref: '/app/workspace-structure',
      destinationLabel: 'Open Workspace Structure',
    }
  }

  return null
}
