import {
  formatRuntimeTokenLabel,
  getExecutionWorkspaceDestinationHref,
} from '../../utils/runtimeWorkspace.js'

const UNAVAILABLE = null

const readCount = (value) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return UNAVAILABLE
  }
  const count = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(count) && count >= 0 ? count : UNAVAILABLE
}

const readPercentage = (value) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return UNAVAILABLE
  }
  const percentage = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
    ? percentage
    : UNAVAILABLE
}

const readProjectedCount = (...values) => {
  const counts = values.map(readCount)
  return counts.find((count) => count !== null)
    ?? UNAVAILABLE
}

const getStatus = (value) => {
  const token = String(value ?? '').trim()
  return token ? formatRuntimeTokenLabel(token) : 'Unavailable'
}

const getReadiness = (discoveryHealth) =>
  discoveryHealth?.readiness && typeof discoveryHealth.readiness === 'object'
    && !Array.isArray(discoveryHealth.readiness)
    ? discoveryHealth.readiness
    : {}

const getSectionStates = (sections) => sections.map((section) => {
  const summary = section?.runtimeStateSummary
  const status = String(summary?.stateStatus ?? summary?.truthStatus ?? '').trim().toUpperCase()
  if (status === 'ACCEPTED' && String(summary?.truthHash ?? '').trim()) return 'accepted'
  if (status === 'DRAFT') return 'draft'
  return null
})

export const buildWorkspaceCapabilityCards = ({
  discovery,
  discoveryHealth,
  evidenceDetail = null,
  sections = [],
  sectionsAvailable = false,
  loading = false,
  workspaceRuntimeInstanceId = '',
  selectedRevisionId = '',
}) => {
  const readiness = getReadiness(discoveryHealth)
  const getDestinationHref = (destination) => getExecutionWorkspaceDestinationHref(
    destination,
    workspaceRuntimeInstanceId,
    selectedRevisionId,
  )
  const sourceCount = readProjectedCount(
    discovery?.sourceRegistrySummary?.count,
    evidenceDetail?.sourceRegistrySummary?.count,
    discovery?.lineageSummary?.sourceCount,
    readiness.sourceCount,
  )
  const evidenceSummaryCount = readProjectedCount(
    discovery?.evidenceObjectSummary?.evidenceObjectCount,
    evidenceDetail?.evidenceObjectSummary?.evidenceObjectCount,
    evidenceDetail?.evidence?.reviewSummary?.evidenceObjectCount,
    readiness.evidenceObjectCount,
    evidenceDetail?.totalCapped === false ? evidenceDetail.total : null,
  )
  const coveragePercent = readPercentage(
    discoveryHealth?.coveragePercent
      ?? readiness.coveragePercent
      ?? discovery?.acquisition?.coverage?.score,
  )
  const evidenceStatus = discovery?.accepted === true
    ? 'Accepted'
    : discovery?.accepted === false
      ? 'Not accepted'
      : getStatus(discovery?.state?.status ?? discovery?.status)
  const missingAreaCount = Array.isArray(discoveryHealth?.missingAreas)
    ? discoveryHealth.missingAreas.length
    : UNAVAILABLE
  const contradictionCount = readCount(
    readiness.unresolvedContradictionCount ?? readiness.contradictionCount,
  )
  const hasQualityFinding = contradictionCount > 0 || missingAreaCount > 0
  const qualityStatus = hasQualityFinding
    ? 'Review recommended'
    : getStatus(readiness.state)
  const sectionStates = sectionsAvailable ? getSectionStates(sections) : []
  const sectionStatesComplete = sectionStates.length > 0 && sectionStates.every(Boolean)
  const acceptedSectionCount = sectionStatesComplete
    ? sectionStates.filter((state) => state === 'accepted').length
    : UNAVAILABLE
  const draftSectionCount = sectionStatesComplete
    ? sectionStates.filter((state) => state === 'draft').length
    : UNAVAILABLE
  const structureStatus = sectionStatesComplete
    ? draftSectionCount > 0
      ? 'In progress'
      : 'Accepted'
    : 'Unavailable'

  return [
    {
      key: 'intelligence',
      mark: 'IH',
      eyebrow: 'INTELLIGENCE',
      title: 'Intelligence Hub',
      status: loading ? 'Loading' : evidenceStatus,
      statusVariant: loading ? 'neutral' : evidenceStatus === 'Accepted' ? 'success' : 'neutral',
      description: 'Customer evidence, accepted intelligence and its lineage.',
      metrics: [
        { label: 'Sources', value: sourceCount },
        { label: 'Evidence', value: evidenceSummaryCount },
        { label: 'Coverage', value: coveragePercent, suffix: '%' },
      ],
      action: 'Open Intelligence Hub',
      href: getDestinationHref('intelligence'),
      accent: 'intelligence',
    },
    {
      key: 'quality',
      mark: 'IQ',
      eyebrow: 'IMPROVE · INTELLIGENCE',
      title: 'Intelligence Quality',
      status: loading ? 'Loading' : qualityStatus,
      statusVariant: loading ? 'neutral' : qualityStatus === 'Review recommended' ? 'warning' : 'neutral',
      description: 'Inspect and resolve quality findings before they affect outputs.',
      metrics: [
        { label: 'Contradictions', value: contradictionCount },
        { label: 'Missing areas', value: missingAreaCount },
        { label: 'Weak signals', value: readCount(readiness.weakSignalCount) },
      ],
      action: 'Review quality findings',
      href: getDestinationHref('quality'),
      accent: 'quality',
    },
    {
      key: 'structure',
      mark: 'WS',
      eyebrow: 'EVIDENCE-BACKED UNDERSTANDING',
      title: 'Workspace Structure',
      status: loading ? 'Loading' : structureStatus,
      statusVariant: loading ? 'neutral' : structureStatus === 'Unavailable' ? 'neutral' : 'success',
      description: 'Generate, review and accept section-specific business understanding.',
      metrics: [
        { label: 'Sections', value: sectionsAvailable ? sections.length : UNAVAILABLE },
        { label: 'Accepted', value: acceptedSectionCount },
        { label: 'Draft', value: draftSectionCount },
      ],
      action: 'Continue structure',
      href: getDestinationHref('structure'),
      accent: 'structure',
    },
    {
      key: 'outcome-studio',
      mark: 'OS',
      eyebrow: 'CUSTOMER OUTCOMES',
      title: 'Outcome Studio',
      status: loading ? 'Loading' : 'Unavailable',
      statusVariant: 'neutral',
      description: 'Create, approve and finalise customer-ready communications.',
      metrics: [
        { label: 'Working drafts', value: UNAVAILABLE },
        { label: 'Approved', value: UNAVAILABLE },
        { label: 'Published', value: UNAVAILABLE },
      ],
      action: 'Open Outcome Studio',
      href: getDestinationHref('outcome-studio'),
      accent: 'outcome-studio',
    },
  ]
}

export const formatCapabilityMetric = (metric) => {
  if (metric.value === null || metric.value === undefined) return '—'
  return `${metric.value}${metric.suffix ?? ''}`
}
