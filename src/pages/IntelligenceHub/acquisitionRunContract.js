const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const terminal = ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED', 'CANCELLED']
export const isTerminalAcquisitionRun = run => terminal.includes(run?.status)
const version = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100
const anchor = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100
export const ORIGINAL_EXTRACTION_UNCONFIRMED = 'ORIGINAL_EXTRACTION_OUTCOME_UNCONFIRMED'
export const isAcquisitionRunId = value => typeof value === 'string' && uuid.test(value)
export const isControlledAcquisitionRun = value => value?.contractVersion === 'controlled-acquisition-run.v1'
export const isProviderFreeSearchRun = value => value?.contractVersion === 'provider-free-search-run.v1'
export const isPublicResearchRun = value => value?.contractVersion === 'public-research-run.v1'
const publicResearchRunMatches = value => {
  const summary = value.publicResearch, configuration = value.researchConfiguration
  const keys = (object, names) => object && !Array.isArray(object) && Object.keys(object).length === names.length && names.every(key => Object.hasOwn(object, key))
  const count = (candidate, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(candidate) && candidate >= 0 && candidate <= max
  const hash = candidate => typeof candidate === 'string' && /^sha256:[a-f0-9]{64}$/.test(candidate)
  const objectId = candidate => typeof candidate === 'string' && /^[a-f0-9]{24}$/.test(candidate)
  const date = candidate => typeof candidate === 'string' && candidate.length <= 100 && Number.isFinite(Date.parse(candidate))
  const sourceId = candidate => typeof candidate === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(candidate)
  const isTerminal = terminal.includes(value.status)
  const hasNews = summary != null && Object.hasOwn(summary, 'newsCapture')
  const captureCategory = hasNews ? 'NEWS' : 'WEBSITE'
  const hasTraversal = summary != null && Object.hasOwn(summary, 'websiteTraversal')
  const traversal = summary?.websiteTraversal
  if (!keys(summary, ['mode', 'classification', 'liveExecutionEnabled', 'planHash', 'policyHash', 'receiptHash', 'releaseId',
    'operationCount', 'completedOperationCount', 'bytesRead', 'reservedCostMicros', 'elapsedMsRecorded', 'modelTokens',
    'limits', 'categories', 'receipts', 'qualifications', ...(hasTraversal ? ['websiteTraversal'] : []), ...(hasNews ? ['newsCapture'] : [])])
    || hasNews && (!keys(summary.newsCapture, ['contractVersion'])
      || summary.newsCapture.contractVersion !== 'public-research-news-capture.v1' || summary.mode !== 'LIVE' || hasTraversal
      || value.discovery !== undefined)
    || hasTraversal && (!keys(traversal, ['contractVersion', 'maxDepth', 'maxLinks'])
      || traversal.contractVersion !== 'public-research-website-traversal.v1' || traversal.maxDepth !== 1
      || traversal.maxLinks !== 100 || summary.mode !== 'LIVE')
    || !['OFFLINE', 'LIVE'].includes(summary.mode)
    || summary.classification !== (summary.mode === 'OFFLINE' ? 'CONTROLLED_PROVIDER_FREE_RESEARCH' : 'NATIVE_PUBLIC_RESEARCH')
    || summary.liveExecutionEnabled !== (summary.mode === 'LIVE')
    || !['planHash', 'policyHash', 'receiptHash'].every(key => hash(summary[key]))
    || !isAcquisitionRunId(summary.releaseId) || summary.releaseId !== value.requestKey
    || !count(summary.operationCount, 5) || !count(summary.completedOperationCount, summary.operationCount)
    || !['bytesRead', 'reservedCostMicros', 'elapsedMsRecorded'].every(key => count(summary[key])) || summary.modelTokens !== 0
    || !keys(configuration, ['configurationVersion', 'configurationHash', 'saveAuditId'])
    || !isAcquisitionRunId(configuration.configurationVersion) || !hash(configuration.configurationHash) || !objectId(configuration.saveAuditId)
    || !isAcquisitionRunId(value.executionAttemptId) || !objectId(value.actorUserId) || value.authority !== 'VMF_UPDATE'
    || value.actionKey !== 'BUILD_EVIDENCE_PACK' || !['STANDARD', 'ENHANCED'].includes(value.acquisitionProfile)
    || !['customerId', 'tenantId', 'runtimeInstanceId'].every(key => objectId(value.scope?.[key]))
    || !date(value.basisUpdatedAt) || !date(value.createdAt) || value.plannerVersion !== 'public-research-planner.v1'
    || value.providerFreeSearch !== undefined || value.receiptRecorded !== undefined) return false
  const limits = summary.limits
  const maxima = { maxSearchRequests: 1, maxRegistryRequests: 1, maxPages: 3, maxPageBytes: 320000, maxJsonBytes: 16384,
    maxTotalBytes: 1048576, maxElapsedMs: 600000, maxRequestMs: 60000, maxCostMicros: 50000,
    searchRequestCostMicros: 50000, registryRequestCostMicros: 50000 }
  if (!keys(limits, [...Object.keys(maxima), 'concurrency', 'retries', 'redirects', 'modelTokens'])
    || Object.entries(maxima).some(([key, max]) => !count(limits[key], max))
    || ['maxPageBytes', 'maxJsonBytes', 'maxTotalBytes', 'maxElapsedMs', 'maxRequestMs'].some(key => limits[key] === 0)
    || limits.concurrency !== 1 || limits.retries !== 0 || limits.redirects !== 0 || limits.modelTokens !== 0
    || summary.reservedCostMicros > limits.maxCostMicros
    || !Array.isArray(summary.categories) || summary.categories.length !== (hasNews ? 4 : 3)
    || new Set(summary.categories.map(category => category?.key)).size !== (hasNews ? 4 : 3)
    || !Array.isArray(summary.receipts) || summary.receipts.length > 5
    || summary.operationCount !== summary.receipts.length
    || summary.completedOperationCount !== summary.receipts.filter(receipt => receipt?.phase === 'RECORDED').length
    || !Array.isArray(summary.qualifications) || summary.qualifications.length > 8
    || summary.qualifications.some(text => typeof text !== 'string' || !text.trim() || text.length > 180)) return false
  const categoryStates = ['NOT_SELECTED', 'NOT_APPLICABLE', 'PENDING', 'RUNNING', 'SUCCEEDED', 'EMPTY', 'PARTIAL', 'FAILED', 'UNKNOWN', 'CANCELLED']
  for (const category of summary.categories) {
    if (!keys(category, ['key', 'status', 'completedCount', 'failedCount', 'unknownCount', 'evidenceObjectCount'])
      || !(hasNews ? ['SEARCH', 'WEBSITE', 'REGISTRY', 'NEWS'] : ['SEARCH', 'WEBSITE', 'REGISTRY']).includes(category.key) || !categoryStates.includes(category.status)
      || !['completedCount', 'failedCount', 'unknownCount', 'evidenceObjectCount'].every(key => count(category[key]))
      || ['NOT_SELECTED', 'NOT_APPLICABLE'].includes(category.status)
        && ['completedCount', 'failedCount', 'unknownCount', 'evidenceObjectCount'].some(key => category[key] !== 0)
      || category.key !== captureCategory && category.evidenceObjectCount !== 0
      || isTerminal && ['PENDING', 'RUNNING'].includes(category.status)) return false
  }
  const ordinals = new Set()
  for (const receipt of summary.receipts) {
    const hasProvenanceHash = receipt != null && Object.hasOwn(receipt, 'provenanceHash')
    const hasScan = receipt != null && Object.hasOwn(receipt, 'linkScan')
    const hasDiscovery = receipt != null && Object.hasOwn(receipt, 'discovery')
    const hasBodyDisposition = receipt != null && Object.hasOwn(receipt, 'bodyDisposition')
    const hasProviderMessage = receipt != null && Object.hasOwn(receipt, 'providerMessage')
    if (!keys(receipt, ['ordinal', 'category', 'phase', 'inputIndex', 'requestHash', 'responseTextHash', 'httpStatus', 'bytesRead',
      'elapsedMs', 'providerRequestId', 'sourceId', 'evidenceObjectCount', ...(hasProviderMessage ? ['providerMessage'] : []), ...(hasBodyDisposition ? ['bodyDisposition'] : []),
      ...(hasScan ? ['linkScan'] : []), ...(hasDiscovery ? ['discovery'] : []), ...(hasProvenanceHash ? ['provenanceHash'] : [])])
      || hasProvenanceHash && (!hasNews || receipt.category !== 'NEWS' || receipt.phase !== 'RECORDED'
        || !hash(receipt.provenanceHash) || receipt.httpStatus !== 200 || !hasBodyDisposition)
      || hasScan && (!hasTraversal || receipt.ordinal !== 0 || receipt.category !== 'WEBSITE'
        || receipt.phase !== 'RECORDED' || receipt.httpStatus !== 200 || !hasBodyDisposition
        || !keys(receipt.linkScan, ['observedAnchorCount', 'truncated', 'baseUnsupported', 'pageLimitReached', 'approvedLinkCount'])
        || !count(receipt.linkScan.observedAnchorCount, 100) || !count(receipt.linkScan.approvedLinkCount, 2)
        || receipt.linkScan.approvedLinkCount > receipt.linkScan.observedAnchorCount
        || !['truncated', 'baseUnsupported', 'pageLimitReached'].every(key => typeof receipt.linkScan[key] === 'boolean')
        || receipt.linkScan.baseUnsupported && receipt.linkScan.approvedLinkCount !== 0
        || receipt.linkScan.truncated && receipt.linkScan.observedAnchorCount !== 100
        || receipt.linkScan.pageLimitReached !== (receipt.linkScan.approvedLinkCount > limits.maxPages - 1))
      || hasDiscovery && (!hasTraversal || receipt.category !== 'WEBSITE' || receipt.ordinal === 0
        || !keys(receipt.discovery, ['method', 'parentOrdinal', 'parentContentHash', 'depth'])
        || receipt.discovery.method !== 'HTML_ANCHOR' || receipt.discovery.parentOrdinal !== 0
        || receipt.discovery.depth !== 1 || !hash(receipt.discovery.parentContentHash))
      || hasBodyDisposition && (receipt.bodyDisposition !== 'NOT_RETAINED_IN_RUN' || receipt.category !== captureCategory
        || summary.mode !== 'LIVE' || receipt.phase !== 'RECORDED')
      || hasProviderMessage && (receipt.category !== 'SEARCH' || receipt.phase !== 'RECORDED' || !(receipt.httpStatus >= 400)
        || !summary.categories.some(category => category.key === 'SEARCH' && category.failedCount > 0)
        || typeof receipt.providerMessage !== 'string' || !receipt.providerMessage.trim()
        || receipt.providerMessage.length > 300 || /\p{Cc}/u.test(receipt.providerMessage))
      || !count(receipt.ordinal, 4) || ordinals.has(receipt.ordinal) || !(hasNews ? ['NEWS'] : ['SEARCH', 'WEBSITE', 'REGISTRY']).includes(receipt.category)
      || !['DISPATCHING', 'RECORDED'].includes(receipt.phase) || !count(receipt.inputIndex, receipt.category === 'WEBSITE' ? 2 : 0)
      || !hash(receipt.requestHash) || !(receipt.responseTextHash === null || hash(receipt.responseTextHash))
      || !(receipt.httpStatus === null || Number.isInteger(receipt.httpStatus) && receipt.httpStatus >= 100 && receipt.httpStatus <= 599)
      || !(receipt.providerRequestId === null || typeof receipt.providerRequestId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(receipt.providerRequestId))
      || !(receipt.sourceId === null || sourceId(receipt.sourceId))
      || !['bytesRead', 'elapsedMs', 'evidenceObjectCount'].every(key => count(receipt[key]))
      || receipt.category !== captureCategory && (receipt.sourceId !== null || receipt.evidenceObjectCount !== 0)
      || receipt.phase === 'DISPATCHING' && (receipt.responseTextHash !== null || receipt.httpStatus !== null || receipt.providerRequestId !== null
        || receipt.sourceId !== null || receipt.bytesRead !== 0 || receipt.elapsedMs !== 0 || receipt.evidenceObjectCount !== 0)) return false
    ordinals.add(receipt.ordinal)
  }
  if (hasNews && (summary.categories.some(category => category.key === 'NEWS' && ['NOT_SELECTED', 'NOT_APPLICABLE'].includes(category.status))
    || limits.maxPages !== 1 || limits.maxSearchRequests !== 0 || limits.maxRegistryRequests !== 0
    || limits.maxCostMicros !== 0 || limits.searchRequestCostMicros !== 0 || limits.registryRequestCostMicros !== 0
    || summary.operationCount > 1 || summary.categories.some(category => category.key !== 'NEWS' && category.status !== 'NOT_SELECTED')
    || summary.receipts.some(receipt => receipt.category !== 'NEWS' || receipt.inputIndex !== 0
      || receipt.phase === 'RECORDED' && !receipt.bodyDisposition
        && (['httpStatus', 'responseTextHash', 'providerRequestId', 'sourceId'].some(key => receipt[key] !== null)
          || ['bytesRead', 'elapsedMs', 'evidenceObjectCount'].some(key => receipt[key] !== 0)
          || Object.hasOwn(receipt, 'provenanceHash'))
      || receipt.sourceId !== null && !receipt.provenanceHash))) return false
  if (value.discovery !== undefined) {
    const discovery = value.discovery, query = discovery?.queryBinding
    const searchReceipts = summary.receipts.filter(receipt => receipt.category === 'SEARCH')
    const receipt = searchReceipts[0]
    const text = (candidate, max, empty = false) => typeof candidate === 'string' && candidate.length <= max
      && (empty || candidate.trim().length > 0)
    const safeUrl = candidate => {
      if (!text(candidate, 500) || Array.from(candidate).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) return false
      try {
        const url = new URL(candidate)
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.port
          && !url.hash && ![...url.searchParams.keys()].some(key =>
            /^(?:api[_-]?key|access_token|token|password|secret|authorization|credential|client_secret|refresh_token)$/i.test(key))
      } catch { return false }
    }
    if (!keys(discovery, ['classification', 'originalEvidence', 'status', 'retrievedAt', 'requestHash', 'responseHash', 'items',
      ...(query !== undefined ? ['queryBinding'] : [])]) || summary.mode !== 'LIVE'
      || discovery.classification !== 'DISCOVERY_METADATA_ONLY' || discovery.originalEvidence !== false
      || !['SUCCESS', 'EMPTY', 'PARTIAL', 'UNAVAILABLE', 'RATE_LIMITED'].includes(discovery.status)
      || searchReceipts.length !== 1 || receipt.phase !== 'RECORDED'
      || discovery.requestHash !== receipt.requestHash || discovery.responseHash !== receipt.responseTextHash
      || !hash(discovery.responseHash) || !date(discovery.retrievedAt)
      || !date(value.startedAt) || Date.parse(discovery.retrievedAt) < Date.parse(value.startedAt)
      || value.completedAt && Date.parse(discovery.retrievedAt) > Date.parse(value.completedAt)
      || !Array.isArray(discovery.items) || discovery.items.length > 4
      || new Set(discovery.items.map(item => item?.url)).size !== discovery.items.length
      || ['SUCCESS', 'PARTIAL'].includes(discovery.status) !== (discovery.items.length > 0)
      || ['SUCCESS', 'EMPTY', 'PARTIAL'].includes(discovery.status) && receipt.httpStatus !== 200
      || discovery.status === 'RATE_LIMITED' && receipt.httpStatus !== 429
      || discovery.status === 'UNAVAILABLE' && [200, 429].includes(receipt.httpStatus)
        && !(receipt.providerRequestId === null && summary.categories.some(category => category.key === 'SEARCH' && category.unknownCount > 0))
      || discovery.items.some((item, index) => !keys(item, ['url', 'title', 'snippet', 'resultOrder'])
        || !safeUrl(item.url) || !text(item.title, 255) || !text(item.snippet, 2000, true) || item.resultOrder !== index + 1)) return false
    if (query !== undefined) {
      if (!keys(query, ['contractVersion', 'submittedQuery', 'providerQuery', 'normalization'])
        || query.contractVersion !== 'tavily-query-binding.v2' || !text(query.submittedQuery, 2000)
        || !text(query.providerQuery, 2000) || !['EXACT', 'LEADING_APPROVED_SITE_OPERATOR_REMOVED'].includes(query.normalization)
        || query.normalization === 'EXACT' && query.submittedQuery !== query.providerQuery
        || query.normalization === 'LEADING_APPROVED_SITE_OPERATOR_REMOVED'
          && (!/^site:[^ ]+ .+$/.test(query.submittedQuery) || query.submittedQuery.slice(query.submittedQuery.indexOf(' ') + 1) !== query.providerQuery)
        || !['SUCCESS', 'EMPTY', 'PARTIAL'].includes(discovery.status)) return false
      const hostname = query.submittedQuery.startsWith('site:') ? query.submittedQuery.slice(5).split(' ')[0] : query.submittedQuery
      if (!safeUrl('https://' + hostname) || new URL('https://' + hostname).hostname !== hostname
        || discovery.items.some(item => new URL(item.url).hostname !== hostname)) return false
    }
  }
  if (hasTraversal) {
    const root = summary.receipts.find(receipt => receipt.ordinal === 0), children = summary.receipts.filter(receipt => receipt.ordinal > 0)
    if (limits.maxPages < 2 || summary.categories.some(category => category.key !== 'WEBSITE' && category.status !== 'NOT_SELECTED')
      || summary.receipts.some(receipt => receipt.category !== 'WEBSITE' || receipt.inputIndex !== receipt.ordinal)
      || children.length > Math.min(root?.linkScan?.approvedLinkCount || 0, limits.maxPages - 1)
      || root?.linkScan?.baseUnsupported && children.length
      || children.some(receipt => !receipt.discovery || !root?.linkScan || root.phase !== 'RECORDED'
        || receipt.discovery.parentContentHash !== root.responseTextHash)) return false
  }
  if (value.status === 'SUCCEEDED' && (summary.bytesRead > limits.maxTotalBytes || summary.elapsedMsRecorded > limits.maxElapsedMs
    || summary.categories.some(category => !['NOT_SELECTED', 'NOT_APPLICABLE', 'SUCCEEDED', 'EMPTY'].includes(category.status)
      || category.failedCount !== 0 || category.unknownCount !== 0)
    || summary.receipts.some(receipt => receipt.bytesRead > (['WEBSITE', 'NEWS'].includes(receipt.category) ? limits.maxPageBytes : limits.maxJsonBytes)
      || receipt.elapsedMs > limits.maxRequestMs))) return false
  const cancellation = value.cancellation
  if (cancellation !== undefined && (!keys(cancellation, value.status === 'CANCELLED'
    ? ['eligible', 'executionAttemptId', 'stage', 'workerStopConfirmed'] : ['eligible', 'executionAttemptId'])
    || typeof cancellation.eligible !== 'boolean' || cancellation.executionAttemptId !== value.executionAttemptId
    || isTerminal && cancellation.eligible)) return false
  const website = summary.categories.find(category => category.key === captureCategory)
  const evidenceRecorded = summary.categories.some(category => category.evidenceObjectCount !== 0)
    || summary.receipts.some(receipt => receipt.evidenceObjectCount !== 0 || receipt.sourceId !== null)
  if (!isTerminal) return value.canonicalSaved !== true && value.outputStateVersion == null && value.audit?.saveId == null && !evidenceRecorded
    && (value.status !== 'RUNNING' || date(value.startedAt)) && (!value.outcomes || value.outcomes.length === 0)
  if (!date(value.completedAt) || typeof value.canonicalSaved !== 'boolean' || !anchor(value.audit?.admissionId) || !anchor(value.audit?.terminalId)
    || !Array.isArray(value.outcomes) || value.outcomes.length < 1 || value.outcomes.length > 5) return false
  const pairs = new Set(), captureKind = summary.mode === 'OFFLINE' ? 'CONTROLLED' : 'WEBSITE'
  let savedEvidence = 0
  for (const outcome of value.outcomes) {
    if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) return false
    const pair = `${outcome.kind}:${outcome.inputIndex}`
    if (!['SEARCH', 'REGISTRY', captureKind].includes(outcome.kind) || pairs.has(pair)
      || !count(outcome.inputIndex, outcome.kind === 'WEBSITE' ? 2 : 0)
      || !['SUCCEEDED', 'FAILED', 'UNATTEMPTED', 'CANCELLED'].includes(outcome.status) || !count(outcome.evidenceObjectCount)
      || outcome.sourceId != null && !sourceId(outcome.sourceId)
      || (outcome.kind !== captureKind || outcome.status !== 'SUCCEEDED') && (outcome.evidenceObjectCount !== 0 || outcome.sourceId != null)) return false
    if (hasNews && (outcome.kind !== 'WEBSITE' || outcome.inputIndex !== 0 || value.outcomes.length !== 1)) return false
    pairs.add(pair)
    if (outcome.kind === captureKind) savedEvidence += outcome.evidenceObjectCount
    if (!count(savedEvidence)) return false
  }
  if (value.canonicalSaved) {
    if (!version(value.outputStateVersion) || !anchor(value.audit?.saveId) || savedEvidence === 0
      || !['SUCCEEDED', 'PARTIALLY_SUCCEEDED'].includes(value.status)
      || value.outcomes.some(outcome => outcome.evidenceObjectCount > 0 && !sourceId(outcome.sourceId))
      || website.evidenceObjectCount !== savedEvidence
      || summary.receipts.reduce((total, receipt) => total + receipt.evidenceObjectCount, 0) !== savedEvidence
      || summary.receipts.some(receipt => receipt.sourceId !== null && !value.outcomes.some(outcome => outcome.kind === captureKind
        && outcome.inputIndex === receipt.inputIndex && outcome.sourceId === receipt.sourceId && outcome.evidenceObjectCount === receipt.evidenceObjectCount))
      || value.outcomes.some(outcome => outcome.sourceId != null && !summary.receipts.some(receipt => receipt.category === captureCategory
        && receipt.inputIndex === outcome.inputIndex && receipt.sourceId === outcome.sourceId))) return false
  } else if (value.outputStateVersion != null || value.audit?.saveId != null || savedEvidence !== 0 || evidenceRecorded
    || value.outcomes.some(outcome => outcome.sourceId != null)
    || value.status === 'SUCCEEDED' && website.status !== 'NOT_SELECTED') return false
  if (value.status === 'CANCELLED') return cancellation?.eligible === false && ['QUEUED', 'RUNNING'].includes(cancellation.stage)
    && cancellation.workerStopConfirmed === false && !value.canonicalSaved
    && value.outcomes.every(outcome => outcome.status === 'CANCELLED' && outcome.evidenceObjectCount === 0 && outcome.sourceId == null)
    && (cancellation.stage === 'QUEUED' ? value.startedAt === undefined && value.audit.startId === undefined : date(value.startedAt) && anchor(value.audit.startId))
  return date(value.startedAt) && anchor(value.audit?.startId) && value.outcomes.every(outcome => outcome.status !== 'CANCELLED')
}
const searchRunMatches = value => {
  const receipt = value.providerFreeSearch, configuration = value.researchConfiguration, selector = receipt?.configuration
  const keys = (object, names) => object && Object.keys(object).length === names.length && names.every(key => Object.hasOwn(object, key))
  const hash = candidate => typeof candidate === 'string' && /^sha256:[a-f0-9]{64}$/.test(candidate)
  const objectId = candidate => typeof candidate === 'string' && /^[a-f0-9]{24}$/.test(candidate)
  if (!keys(receipt, ['classification', 'purpose', 'authorityRef', 'provider', 'recordHash', 'rawResponseHash', 'descriptorHash',
    'mappedResponseHash', 'adaptationStatus', 'providerRequestId', 'transportOutcome', 'httpStatus', 'configuration',
    'discoveryItemCount', 'liveExecutionEnabled', 'evidenceObjectCount'])
    || receipt.classification !== 'LOCAL_SYNTHETIC_RECEIPT_ONLY' || receipt.purpose !== 'TAVILY_DISCOVERY_RECEIPT'
    || receipt.authorityRef !== 'ss049-provider-free-search-receipt.2026-11-13.v1' || receipt.provider !== 'TAVILY_SEARCH'
    || !['recordHash', 'rawResponseHash', 'descriptorHash', 'mappedResponseHash'].every(key => hash(receipt[key]))
    || !['VALID', 'INVALID_RESPONSE'].includes(receipt.adaptationStatus)
    || !(receipt.providerRequestId === null || typeof receipt.providerRequestId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(receipt.providerRequestId))
    || !['COMPLETE', 'PARTIAL', 'TIMEOUT'].includes(receipt.transportOutcome)
    || !(receipt.httpStatus === null || Number.isInteger(receipt.httpStatus) && receipt.httpStatus >= 100 && receipt.httpStatus <= 599)
    || (receipt.transportOutcome === 'TIMEOUT') !== (receipt.httpStatus === null)
    || !Number.isSafeInteger(receipt.discoveryItemCount) || receipt.discoveryItemCount < 0 || receipt.discoveryItemCount > 4
    || receipt.liveExecutionEnabled !== false || receipt.evidenceObjectCount !== 0
    || !keys(configuration, ['configurationVersion', 'configurationHash', 'saveAuditId'])
    || !isAcquisitionRunId(configuration.configurationVersion) || !hash(configuration.configurationHash) || !objectId(configuration.saveAuditId)
    || !keys(selector, ['configurationVersion', 'configurationHash', 'basisStateVersion'])
    || selector.configurationVersion !== configuration.configurationVersion || selector.configurationHash !== configuration.configurationHash
    || selector.basisStateVersion !== value.basisStateVersion
    || !isAcquisitionRunId(value.executionAttemptId) || !objectId(value.actorUserId) || value.authority !== 'VMF_UPDATE'
    || value.actionKey !== 'BUILD_EVIDENCE_PACK' || !['STANDARD', 'ENHANCED'].includes(value.acquisitionProfile)
    || !['customerId', 'tenantId', 'runtimeInstanceId'].every(key => objectId(value.scope?.[key]))
    || !['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'].includes(value.status)
    || value.receiptRecorded !== true || value.canonicalSaved !== false || value.cancellation !== undefined
    || value.outputStateVersion != null || value.audit?.saveId != null || value.currency === 'CURRENT_OUTPUT'
    || !anchor(value.audit?.admissionId) || !anchor(value.audit?.startId) || !anchor(value.audit?.terminalId)
    || !Array.isArray(value.outcomes) || value.outcomes.length !== 1) return false
  const item = value.outcomes[0], failed = receipt.adaptationStatus === 'INVALID_RESPONSE' || receipt.httpStatus !== 200
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false
  const expectedStatus = failed ? 'FAILED' : receipt.transportOutcome === 'PARTIAL' ? 'PARTIALLY_SUCCEEDED' : 'SUCCEEDED'
  return value.status === expectedStatus && (!failed || receipt.discoveryItemCount === 0)
    && (receipt.adaptationStatus === 'VALID' && receipt.httpStatus === 200 ? receipt.providerRequestId !== null : receipt.providerRequestId === null)
    && (value.status !== 'PARTIALLY_SUCCEEDED' || receipt.discoveryItemCount > 0)
    && item.kind === 'SEARCH' && item.inputIndex === 0 && item.evidenceObjectCount === 0
    && item.sourceId === undefined && item.contentHash === undefined && item.status === (failed ? 'FAILED' : 'SUCCEEDED')
}
const controlledRunMatches = value => {
  const descriptor = value.controlledReplayProvenance, binding = descriptor?.binding, provenance = descriptor?.provenance
  const hash = candidate => typeof candidate === 'string' && /^sha256:[a-f0-9]{64}$/.test(candidate)
  const objectId = candidate => typeof candidate === 'string' && /^[a-f0-9]{24}$/.test(candidate)
  return binding?.contractVersion === 'controlled-replay-binding.v1'
    && binding.classification === 'CONTROLLED_SYNTHETIC_REPLAY' && binding.environment === 'DEVELOPMENT_TEST'
    && typeof binding.bindingId === 'string' && /^[a-z0-9][a-z0-9._-]{0,159}$/.test(binding.bindingId)
    && Number.isSafeInteger(binding.bindingVersion) && binding.bindingVersion > 0
    && ['customerId', 'tenantId', 'runtimeInstanceId'].every(key => objectId(binding.scope?.[key]) && binding.scope[key] === value.scope?.[key])
    && objectId(binding.actorUserId) && binding.actorUserId === value.actorUserId
    && binding.revisionId === value.scope?.runtimeInstanceKey && binding.basisStateVersion === value.basisStateVersion
    && ['BUILD_EVIDENCE_PACK', 'REFRESH_EVIDENCE_PACK'].includes(value.actionKey)
    && provenance?.contractVersion === 'controlled-replay-provenance.v1'
    && provenance.classification === 'CONTROLLED_SYNTHETIC_REPLAY' && provenance.operation === 'CONTROLLED_HTML_REPLAY_CAPTURE'
    && provenance.adapter === 'controlled-html-replay-v1' && hash(provenance.bindingDigest)
    && provenance.bindingId === binding.bindingId && provenance.bindingVersion === binding.bindingVersion
    && typeof binding.fixture?.fixtureId === 'string' && binding.fixture.fixtureId.length > 0
    && Number.isSafeInteger(binding.fixture.fixtureVersion) && binding.fixture.fixtureVersion > 0
    && ['fixtureFileSha256', 'htmlSha256'].every(key => /^[a-f0-9]{64}$/.test(binding.fixture[key]))
    && typeof binding.fixture.sourceUrl === 'string' && binding.fixture.sourceUrl.length > 0
    && ['fixtureId', 'fixtureVersion', 'fixtureFileSha256', 'htmlSha256', 'sourceUrl'].every(key => provenance[key] === binding.fixture[key])
}
export const readAcquisitionRun = (value, scope, requestKey) => {
  const controlled = isControlledAcquisitionRun(value), search = isProviderFreeSearchRun(value), research = isPublicResearchRun(value)
  // The server verifies signed receipts. Client checks bind the recorded DTO to
  // this exact read; they do not independently verify fixture bytes or authority.
  if ((!controlled && !search && !research && value?.contractVersion !== 'acquisition-run.v1') || !isAcquisitionRunId(value.runId)
    || !isAcquisitionRunId(value.requestKey) || requestKey && value.requestKey !== requestKey
    || (value.scope?.runtimeInstanceKey !== scope.runtimeInstanceId
      && (!/^[a-f0-9]{24}$/i.test(scope.runtimeInstanceId) || value.scope?.runtimeInstanceId !== scope.runtimeInstanceId))
    || value.scope?.customerId !== scope.customerId || value.scope?.tenantId !== scope.tenantId
    || !['QUEUED', 'RUNNING', ...terminal].includes(value.status)
    || !version(value.basisStateVersion)
    || value.predecessorRunId !== undefined && !isAcquisitionRunId(value.predecessorRunId)
    || value.executionAttemptId !== undefined && !isAcquisitionRunId(value.executionAttemptId)
    || value.predecessorExecutionAttemptId !== undefined && ((!controlled && !search && !research) || !value.researchConfiguration || !isAcquisitionRunId(value.predecessorExecutionAttemptId))
    || (controlled || search || research) && value.researchConfiguration && Boolean(value.predecessorRunId) !== Boolean(value.predecessorExecutionAttemptId)
    || value.currency !== undefined && (!['CURRENT_OUTPUT', 'HISTORICAL_OUTPUT', 'ACTIVE'].includes(value.currency)
      || (value.currency === 'ACTIVE') === terminal.includes(value.status))
    || (controlled ? !controlledRunMatches(value) : value.controlledReplayProvenance !== undefined)
    || !search && (value.providerFreeSearch !== undefined || value.receiptRecorded !== undefined)
    || !research && (value.publicResearch !== undefined || value.discovery !== undefined)) return null
  if (research) return publicResearchRunMatches(value) ? value : null
  if (search) return searchRunMatches(value) ? value : null
  const cancellation = value.cancellation
  if (cancellation !== undefined) {
    const saved = value.researchConfiguration
    if (!controlled || typeof cancellation?.eligible !== 'boolean' || !isAcquisitionRunId(cancellation.executionAttemptId)
      || !isAcquisitionRunId(saved?.configurationVersion) || !/^sha256:[a-f0-9]{64}$/.test(saved?.configurationHash)
      || !/^[a-f0-9]{24}$/.test(saved?.saveAuditId) || saved.basisStateVersion !== value.basisStateVersion
      || saved.basisUpdatedAt !== value.basisUpdatedAt
      || ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey'].some(key => saved.scope?.[key] !== value.scope?.[key])
      || cancellation.eligible && terminal.includes(value.status)) return null
  }
  if (value.status === 'CANCELLED' && (!controlled || !cancellation || cancellation.eligible !== false
    || !['QUEUED', 'RUNNING'].includes(cancellation.stage) || cancellation.workerStopConfirmed !== false
    || value.reason !== 'CANCELLED_BEFORE_SAVE'
    || cancellation.stage === 'QUEUED' && (value.startedAt !== undefined || value.audit?.startId !== undefined)
    || cancellation.stage === 'RUNNING' && (!value.startedAt || !anchor(value.audit?.startId)))) return null
  if (!terminal.includes(value.status)) return typeof value.recovery === 'string' && value.recovery.length <= 512 ? value : null
  if (typeof value.canonicalSaved !== 'boolean' || value.canonicalSaved && (!version(value.outputStateVersion) || !anchor(value.audit?.saveId))
    || !value.canonicalSaved && value.outputStateVersion != null
    || !value.canonicalSaved && value.audit?.saveId != null
    || value.currency === 'CURRENT_OUTPUT' && !value.canonicalSaved
    || !value.canonicalSaved && !['FAILED', 'CANCELLED'].includes(value.status) || !Array.isArray(value.outcomes)
    || value.outcomes.length < 1 || value.outcomes.length > 16
    || value.outcomes.some(item => !(controlled ? ['CONTROLLED'] : ['BRIEF', 'WEBSITE', 'DOCUMENT']).includes(item?.kind)
      || !Number.isSafeInteger(item.inputIndex) || item.inputIndex < 0
      || !['SUCCEEDED', 'FAILED', 'UNATTEMPTED', 'CANCELLED'].includes(item.status)
      || (item.status === 'CANCELLED') !== (value.status === 'CANCELLED')
      || item.status === 'CANCELLED' && (item.reason !== 'CANCELLED_BEFORE_SAVE' || item.sourceId || item.contentHash)
      || !Number.isSafeInteger(item.evidenceObjectCount) || item.evidenceObjectCount < 0
      || item.status !== 'SUCCEEDED' && item.evidenceObjectCount !== 0)
    || !anchor(value.audit?.admissionId) || !(value.status === 'CANCELLED' && cancellation.stage === 'QUEUED') && !anchor(value.audit?.startId) || !anchor(value.audit?.terminalId)) return null
  const counts = new Map()
  for (const item of value.outcomes) {
    const index = counts.get(item.kind) || 0
    if (item.inputIndex !== index || index >= (['BRIEF', 'CONTROLLED'].includes(item.kind) ? 1 : item.kind === 'WEBSITE' ? 10 : 5)) return null
    counts.set(item.kind, index + 1)
    if (item.kind !== 'BRIEF' && item.status === 'SUCCEEDED'
      && (typeof item.sourceId !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(item.sourceId))) return null
  }
  if (controlled ? counts.get('CONTROLLED') !== 1 || value.outcomes.length !== 1 : counts.get('BRIEF') !== 1) return null
  if (value.reason === 'STOPPED_WORKER_RECOVERY' || value.outcomes.some(item => item.reason === ORIGINAL_EXTRACTION_UNCONFIRMED)) {
    if (value.reason !== 'STOPPED_WORKER_RECOVERY' || value.status !== 'FAILED' || value.canonicalSaved !== false
      || value.outcomes.some(item => item.status !== 'FAILED' || item.reason !== ORIGINAL_EXTRACTION_UNCONFIRMED
        || item.evidenceObjectCount !== 0 || item.sourceId || item.contentHash)) return null
  }
  if (value.canonicalSaved) {
    const all = value.outcomes.every(item => item.status === 'SUCCEEDED'), some = value.outcomes.some(item => item.status === 'SUCCEEDED')
    if (value.status !== (all ? 'SUCCEEDED' : some ? 'PARTIALLY_SUCCEEDED' : 'FAILED')) return null
  }
  return value
}
export const acquisitionRunFromResponse = (response, scope, requestKey) => readAcquisitionRun(
  response?.data?.acquisitionRun || response?.acquisitionRun, scope, requestKey)
export const acquisitionRunFromError = (error, scope, requestKey) => readAcquisitionRun(
  error?.data?.error?.details?.acquisitionRun || error?.details?.acquisitionRun, scope, requestKey)
export const acquisitionRunLabel = run => `${run.status.replaceAll('_', ' ')} · ${isPublicResearchRun(run)
  ? !isTerminalAcquisitionRun(run) ? 'Recorded research progress' : run.canonicalSaved ? 'Original evidence saved; see Review for decisions' : 'No original evidence saved'
  : isProviderFreeSearchRun(run) ? 'Search receipt recorded; no evidence saved' : run.canonicalSaved === true ? 'Revision saved' : run.canonicalSaved === false ? 'Revision not saved' : 'Outcome unconfirmed'}`
