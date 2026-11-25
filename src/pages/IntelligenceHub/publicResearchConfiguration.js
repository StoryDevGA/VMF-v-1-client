import { readGithubCapture, githubCaptureRequestUrl } from './githubCaptureContract.js'
import { readIndustryCapture } from './industryCaptureContract.js'
export const PUBLIC_RESEARCH_SOURCES = Object.freeze([
  { key: 'WEBSITE', label: 'Official website', boundary: 'Public representation, not independent proof of outcomes.' },
  { key: 'SEARCH', label: 'Public web search', boundary: 'Discovery only; snippets and AI summaries are not source evidence.' },
  { key: 'REGISTRY', label: 'Official corporate registry', boundary: 'Legal identity and supported filings, not commercial validation.' },
  { key: 'GITHUB', label: 'GitHub', boundary: 'Public code does not establish adoption or customer outcomes.' },
  { key: 'LINKEDIN', label: 'LinkedIn', boundary: 'Public profiles and hiring signals remain qualified representations.' },
  { key: 'SOCIAL', label: 'X and Instagram', boundary: 'Public account relationships must be established; posts and engagement can change.' },
  { key: 'NEWS', label: 'News', boundary: 'Reporting needs attribution, publication dates and supporting originals.' },
  { key: 'REVIEWS', label: 'Reviews', boundary: 'Reviewer statements are attributed claims, not verified customer outcomes.' },
  { key: 'INDUSTRY', label: 'Industry sources', boundary: 'Market context does not establish facts about the target company.' },
])

export const researchPurpose = brief => [
  brief.companyName && `Company: ${brief.companyName}`,
  brief.marketRegion && `Market / region: ${brief.marketRegion}`,
  brief.targetOffer && `Product or service: ${brief.targetOffer}`,
  brief.notes && `Evidence gathering context: ${brief.notes}`,
].filter(Boolean).join('\n')

export const initialResearchConfiguration = brief => ({
  startingUrls: (Array.isArray(brief.websiteSources) ? brief.websiteSources : [brief.companyWebsite]).filter(Boolean).join('\n'),
  legalEntity: '', countryCode: '', entityIdentifier: '', entityConfirmed: false, ukSubsidiary: false,
  sources: ['WEBSITE', 'SEARCH'], instructions: '',
})

export const registryEligible = config => Boolean(config.entityConfirmed && config.legalEntity.trim()
  && (config.countryCode === 'GB' || config.ukSubsidiary))

export const changeResearchJurisdiction = (config, changes) => {
  const next = { ...config, ...changes }
  // Confirmation belongs to the exact entity/country, never a previous spelling.
  if (['legalEntity', 'countryCode', 'entityIdentifier', 'ukSubsidiary'].some(key => Object.hasOwn(changes, key))) next.entityConfirmed = false
  next.sources = next.sources.filter(key => key !== 'REGISTRY')
  if (registryEligible(next)) next.sources = [...next.sources, 'REGISTRY']
  return next
}

export const researchConfigurationProblem = config => {
  const urls = config.startingUrls.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
  if (!urls.length) return 'Provide at least one starting URL.'
  if (urls.length > 10) return 'Use up to 10 starting URLs.'
  for (const value of urls) {
    try {
      const url = new URL(value)
      if (value.length > 500 || !['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error()
    } catch { return 'Use complete public HTTP or HTTPS starting URLs without credentials.' }
  }
  if (config.countryCode && !/^[A-Z]{2}$/.test(config.countryCode)) return 'Use a two-letter country code, or leave jurisdiction unresolved.'
  if (!config.sources.length) return 'Select at least one source category.'
  return ''
}

export const researchContextSnapshot = brief => Object.fromEntries(
  ['companyName', 'marketRegion', 'targetOffer', 'notes'].map(key => [key, String(brief[key] || '').trim()]))
export const savedResearchDraft = record => ({ ...record.settings, startingUrls: record.settings.startingUrls.join('\n') })
export const readSavedResearchConfiguration = (response, scope, stateVersion) => {
  const value = response?.data
  const sameScope = candidate => candidate?.customerId === scope.customerId && candidate.tenantId === scope.tenantId
    && (candidate.runtimeInstanceKey === scope.runtimeInstanceId || candidate.runtimeInstanceId === scope.runtimeInstanceId)
  const version = candidate => typeof candidate === 'string' && candidate.length > 0 && candidate.length <= 100
  if (!stateVersion || value?.contractVersion !== 'public-research-configuration-read.v1' || !sameScope(value.scope)
    || value.basis?.stateVersion !== stateVersion || !Number.isFinite(Date.parse(value.basis?.updatedAt))
    || typeof value.editable !== 'boolean') return null
  const record = value.configuration
  if (record === null) return value.currency === 'NOT_RECORDED' ? value : null
  const uuid = candidate => typeof candidate === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(candidate)
  const keys = new Set(PUBLIC_RESEARCH_SOURCES.map(item => item.key)), settings = record?.settings
  if (record?.contractVersion !== 'public-research-configuration.v1' || !sameScope(record.scope)
    || record.scope.runtimeInstanceId !== value.scope.runtimeInstanceId || record.scope.runtimeInstanceKey !== value.scope.runtimeInstanceKey || !uuid(record.configurationVersion)
    || !/^sha256:[a-f0-9]{64}$/.test(record.configurationHash) || !/^[a-f0-9]{24}$/.test(record.saveAuditId)
    || !/^[a-f0-9]{24}$/.test(record.savedBy) || !Number.isFinite(Date.parse(record.savedAt))
    || record.contextSource !== 'USER_PREPARED_CONTEXT_BRIEF' || !['STANDARD', 'ENHANCED'].includes(record.coverage)
    || !['companyName', 'marketRegion', 'targetOffer', 'notes'].every(key => typeof record.context?.[key] === 'string') || !record.context.companyName.trim()
    || record.purpose !== researchPurpose(record.context) || !version(record.basisStateVersion)
    || !Number.isFinite(Date.parse(record.basisUpdatedAt)) || !Array.isArray(settings?.startingUrls)
    || !settings.startingUrls.every(url => typeof url === 'string')
    || !['legalEntity', 'countryCode', 'entityIdentifier', 'instructions'].every(key => typeof settings[key] === 'string')
    || typeof settings.entityConfirmed !== 'boolean' || typeof settings.ukSubsidiary !== 'boolean'
    || !Array.isArray(settings.sources) || settings.sources.length > 9 || new Set(settings.sources).size !== settings.sources.length
    || !settings.sources.every(key => keys.has(key)) || researchConfigurationProblem(savedResearchDraft(record))) return null
  const currency = record.basisStateVersion === value.basis.stateVersion && record.basisUpdatedAt === value.basis.updatedAt ? 'CURRENT_BASIS' : 'STALE_BASIS'
  return value.currency === currency ? value : null
}

export const RESEARCH_AVAILABILITY_MESSAGES = Object.freeze({
  CONFIGURATION_NOT_RECORDED: 'Save research settings before checking availability.',
  REVISION_NOT_EDITABLE: 'Research execution is unavailable for this locked, published or inactive revision.',
  CONFIGURATION_STALE: 'Saved settings belong to an older revision basis. Review and save them again.',
  OPERATING_APPROVAL_NOT_RECORDED: 'Provider/registry operating approval is not recorded. No retrieval will run.',
  SOURCE_NOT_SELECTED: 'This category is not selected in the saved settings.',
  SOURCE_UNSUPPORTED: 'This category has no supported execution path in this environment.',
  UK_REGISTRY_NOT_APPLICABLE: 'The initial UK registry path does not apply to this entity.',
  ENTITY_UNCONFIRMED: 'Confirm a UK entity or explicit UK subsidiary before any future registry lookup.',
})
export const researchDraftMatchesSaved = (draft, saved) => {
  if (!saved) return false
  const settings = saved.settings, urls = draft.startingUrls.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
  return JSON.stringify(urls) === JSON.stringify(settings.startingUrls)
    && ['legalEntity', 'countryCode', 'entityIdentifier', 'entityConfirmed', 'ukSubsidiary', 'instructions']
      .every(key => draft[key] === settings[key])
    && JSON.stringify(draft.sources) === JSON.stringify(settings.sources)
}
export const RESEARCH_CAPABILITY_LABELS = Object.freeze({
  NATIVE_GATED: 'Implemented method · operating release required',
  UNAVAILABLE: 'Retrieval unavailable',
  SEPARATE_SPRINT: 'Separate registry work',
})
export const readResearchCapabilityMatrix = value => {
  const exact = (row, fields) => row && !Array.isArray(row) && Object.keys(row).length === fields.length
    && fields.every(key => Object.hasOwn(row, key))
  const implementation = { WEBSITE: 'NATIVE_GATED', SEARCH: 'NATIVE_GATED', REGISTRY: 'SEPARATE_SPRINT',
    GITHUB: 'NATIVE_GATED', LINKEDIN: 'UNAVAILABLE', SOCIAL: 'UNAVAILABLE', NEWS: 'NATIVE_GATED',
    REVIEWS: 'UNAVAILABLE', INDUSTRY: 'NATIVE_GATED' }
  if (!exact(value, ['contractVersion', 'categories']) || value.contractVersion !== 'public-research-capability-matrix.v1'
    || !Array.isArray(value.categories) || value.categories.length !== PUBLIC_RESEARCH_SOURCES.length
    || new Set(value.categories.map(row => row?.key)).size !== PUBLIC_RESEARCH_SOURCES.length) return null
  for (const row of value.categories) {
    if (!exact(row, ['key', 'implementation', 'method', 'limitation'])
      || typeof row.key !== 'string' || !Object.hasOwn(implementation, row.key) || row.implementation !== implementation[row.key]
      || ![['method', 120], ['limitation', 400]].every(([key, max]) => typeof row[key] === 'string'
        && row[key].trim().length > 0 && row[key].length <= max)) return null
  }
  return value
}
export const readResearchAvailability = value => {
  const availability = value?.availability, record = value?.configuration
  const sameFields = (left, right, fields) => fields.every(key => left?.[key] === right?.[key])
  if (!availability || availability.contractVersion !== 'public-research-availability.v1'
    || availability.canStart !== false || availability.executionEnabled !== false
    || !['CONFIGURATION_NOT_RECORDED', 'REVISION_NOT_EDITABLE', 'CONFIGURATION_STALE', 'OPERATING_APPROVAL_NOT_RECORDED'].includes(availability.reason)
    || availability.configurationVersion !== (record?.configurationVersion || null)
    || availability.configurationHash !== (record?.configurationHash || null)
    || Object.hasOwn(availability, 'capabilityMatrix') && !readResearchCapabilityMatrix(availability.capabilityMatrix)
    || !Array.isArray(availability.categories) || availability.categories.length !== PUBLIC_RESEARCH_SOURCES.length
    || new Set(availability.categories.map(item => item?.key)).size !== PUBLIC_RESEARCH_SOURCES.length) return null
  for (const category of availability.categories) {
    if (!PUBLIC_RESEARCH_SOURCES.some(source => source.key === category?.key)
      || typeof category.selected !== 'boolean' || category.selected !== Boolean(record?.settings.sources.includes(category.key))
      || !['NOT_SELECTED', 'GATED', 'UNAVAILABLE', 'NOT_APPLICABLE'].includes(category.status)
      || category.selected === (category.status === 'NOT_SELECTED')
      || !['SOURCE_NOT_SELECTED', 'OPERATING_APPROVAL_NOT_RECORDED', 'SOURCE_UNSUPPORTED', 'UK_REGISTRY_NOT_APPLICABLE', 'ENTITY_UNCONFIRMED'].includes(category.reason)) return null
  }
  const mapping = availability.requestMapping
  if (!record || !value.editable || value.currency !== 'CURRENT_BASIS') return mapping === null ? availability : null
  if (mapping?.contractVersion !== 'public-research-request-mapping.v1'
    || !sameFields(mapping, record, ['configurationVersion', 'configurationHash', 'saveAuditId', 'contextSource', 'purpose'])
    || !sameFields(mapping.scope, value.scope, ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey'])
    || !sameFields(mapping.basis, value.basis, ['stateVersion', 'updatedAt'])
    || !sameFields(mapping.inputs, record.context, ['companyName', 'marketRegion', 'targetOffer', 'notes'])
    || mapping.acquisitionProfile !== record.coverage || !mapping.settings
    || !sameFields(mapping.settings, record.settings, ['legalEntity', 'countryCode', 'entityIdentifier', 'entityConfirmed', 'ukSubsidiary', 'instructions'])
    || JSON.stringify(mapping.settings.startingUrls) !== JSON.stringify(record.settings.startingUrls)
    || JSON.stringify(mapping.settings.sources) !== JSON.stringify(record.settings.sources)) return null
  return availability
}

export const readFixtureStart = data => {
  const availability = readResearchAvailability(data), fixture = availability?.fixtureStart, record = data?.configuration
  // A present Public Research capability owns this decision, including a hold.
  // It must never fall through to an unrelated older fixture descriptor.
  if (availability && Object.hasOwn(availability, 'researchStart')) {
    const start = availability.researchStart
    const keys = (value, expected) => value && !Array.isArray(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key))
    const offline = start?.mode === 'OFFLINE'
    const safeNewsUrl = candidate => {
      try {
        const url = new URL(candidate)
        return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search && !url.port
      } catch { return false }
    }
    const fields = ['contractVersion', 'eligible', 'mode', 'liveExecutionEnabled', 'classification', 'actorUserId', 'scope', 'basis', 'selector', 'requestKey']
    const combined = Object.hasOwn(start || {}, 'newsCapture')
    const github = Object.hasOwn(start || {}, 'githubCapture')
    const industry = Object.hasOwn(start || {}, 'industryCapture')
    if (offline) fields.push('fixture')
    if (combined) fields.push('newsCapture')
    if (github) fields.push('githubCapture')
    if (industry) fields.push('industryCapture')
    if (!keys(start, fields) || start.contractVersion !== 'public-research-start.v1' || start.eligible !== true || !record
      || !['OFFLINE', 'LIVE'].includes(start.mode) || start.liveExecutionEnabled !== !offline
      || start.classification !== (offline ? 'CONTROLLED_PROVIDER_FREE_RESEARCH' : 'NATIVE_PUBLIC_RESEARCH')
      || data.currency !== 'CURRENT_BASIS' || data.editable !== true || !availability.requestMapping
      || start.actorUserId !== record.savedBy || !/^[a-f0-9]{24}$/.test(start.actorUserId)
      || !keys(start.scope, ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey'])
      || ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey'].some(key => start.scope[key] !== data.scope[key])
      || !keys(start.basis, ['stateVersion', 'updatedAt']) || start.basis.stateVersion !== data.basis.stateVersion || start.basis.updatedAt !== data.basis.updatedAt
      || !keys(start.selector, ['configurationVersion', 'configurationHash', 'basisStateVersion'])
      || start.selector.configurationVersion !== record.configurationVersion || start.selector.configurationHash !== record.configurationHash
      || start.selector.basisStateVersion !== data.basis.stateVersion
      || record.settings.sources.some(key => !['SEARCH', 'WEBSITE', 'REGISTRY', 'NEWS', 'GITHUB', 'INDUSTRY'].includes(key))
      || (github || record.settings.sources.includes('GITHUB')) && (offline || !github || combined || industry
        || !readGithubCapture(start.githubCapture) || record.settings.sources.length !== 1 || record.settings.sources[0] !== 'GITHUB'
        || record.settings.startingUrls.length !== 1 || record.settings.startingUrls[0] !== githubCaptureRequestUrl(start.githubCapture))
      || (industry || record.settings.sources.includes('INDUSTRY')) && (offline || !industry || combined || github
        || !readIndustryCapture(start.industryCapture) || record.settings.sources.length !== 1 || record.settings.sources[0] !== 'INDUSTRY'
        || record.settings.startingUrls.length !== 1 || record.settings.startingUrls[0] !== start.industryCapture.reportUrl)
      || combined && (offline || !keys(start.newsCapture, ['contractVersion', 'articleUrl'])
        || start.newsCapture.contractVersion !== 'public-research-news-capture.v2'
        || record.settings.sources.length !== 3 || !['WEBSITE', 'SEARCH', 'NEWS'].every(key => record.settings.sources.includes(key))
        || record.settings.startingUrls.length < 2 || record.settings.startingUrls.length > 3
        || new Set(record.settings.startingUrls).size !== record.settings.startingUrls.length
        || !record.settings.startingUrls.every(target => typeof target === 'string' && target.length <= 500 && safeNewsUrl(target))
        || record.settings.startingUrls.indexOf(start.newsCapture.articleUrl) < 1)
      || !combined && record.settings.sources.includes('NEWS') && (offline || record.settings.sources.length !== 1
        || record.settings.startingUrls.length !== 1 || !safeNewsUrl(record.settings.startingUrls[0]))) return null
    if (offline) {
      if (start.requestKey !== null || !keys(start.fixture, ['fixtureId', 'fixtureVersion', 'fixtureFileSha256', 'controlledBindingId'])
        || start.fixture.fixtureId !== 'controlled-public-research.v1' || start.fixture.fixtureVersion !== 1
        || !/^[a-f0-9]{64}$/.test(start.fixture.fixtureFileSha256) || start.fixture.controlledBindingId !== 'local-public-research.1'
        || record.settings.startingUrls.length !== 1 || record.settings.startingUrls[0] !== 'https://controlled-context.example/case-study') return null
    } else if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(start.requestKey)) return null
    return start
  }
  if (fixture?.contractVersion === 'provider-free-search-start.v1') {
    const keys = (value, expected) => value && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key))
    return fixture.eligible === true && record && data.currency === 'CURRENT_BASIS' && data.editable === true && availability.requestMapping
      && keys(fixture, ['contractVersion', 'eligible', 'classification', 'provider', 'actorUserId', 'scope', 'basis', 'selector', 'fixture', 'receiptOnly', 'liveExecutionEnabled'])
      && fixture.classification === 'LOCAL_SYNTHETIC_RECEIPT_ONLY' && fixture.provider === 'TAVILY_SEARCH'
      && fixture.receiptOnly === true && fixture.liveExecutionEnabled === false && fixture.actorUserId === record.savedBy
      && /^[a-f0-9]{24}$/.test(fixture.actorUserId)
      && ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey'].every(key => fixture.scope?.[key] === data.scope[key])
      && fixture.basis?.stateVersion === data.basis.stateVersion && fixture.basis?.updatedAt === data.basis.updatedAt
      && keys(fixture.selector, ['configurationVersion', 'configurationHash', 'basisStateVersion'])
      && fixture.selector.configurationVersion === record.configurationVersion && fixture.selector.configurationHash === record.configurationHash
      && fixture.selector.basisStateVersion === data.basis.stateVersion
      && record.settings.sources.length === 1 && record.settings.sources[0] === 'SEARCH' && record.settings.startingUrls.length === 1
      && keys(fixture.fixture, ['fixtureId', 'fixtureVersion', 'fixtureFileSha256', 'targetUrl', 'provider'])
      && fixture.fixture.fixtureId === 'trilogy-clients-search.v1' && fixture.fixture.fixtureVersion === 1
      && /^[a-f0-9]{64}$/.test(fixture.fixture.fixtureFileSha256) && fixture.fixture.provider === 'TAVILY_SEARCH'
      && fixture.fixture.targetUrl === 'https://www.trilogywebsolutions.co.uk/clients/' && fixture.fixture.targetUrl === record.settings.startingUrls[0]
      ? fixture : null
  }
  if (fixture?.contractVersion !== 'controlled-fixture-start.v1' || fixture.eligible !== true || !record
    || data.currency !== 'CURRENT_BASIS' || data.editable !== true || !availability.requestMapping
    || fixture.classification !== 'CONTROLLED_SYNTHETIC_REPLAY' || !/^[a-f0-9]{24}$/.test(fixture.actorUserId)
    || typeof fixture.bindingId !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/.test(fixture.bindingId)
    || !/^sha256:[a-f0-9]{64}$/.test(fixture.bindingDigest)
    || ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey'].some(key => fixture.scope?.[key] !== data.scope[key])
    || fixture.basis?.stateVersion !== data.basis.stateVersion || fixture.basis?.updatedAt !== data.basis.updatedAt
    || fixture.selector?.configurationVersion !== record.configurationVersion || fixture.selector?.configurationHash !== record.configurationHash
    || fixture.selector?.basisStateVersion !== data.basis.stateVersion
    || record.settings.sources.length !== 1 || record.settings.sources[0] !== 'WEBSITE' || record.settings.startingUrls.length !== 1
    || fixture.fixture?.sourceUrl !== record.settings.startingUrls[0] || typeof fixture.fixture.fixtureId !== 'string'
    || !Number.isSafeInteger(fixture.fixture.fixtureVersion) || fixture.fixture.fixtureVersion < 1
    || !['fixtureFileSha256', 'htmlSha256'].every(key => /^[a-f0-9]{64}$/.test(fixture.fixture[key]))) return null
  return fixture
}
export const buildFixtureStartPayload = (data, requestKey) => {
  const fixture = readFixtureStart(data)
  if (!fixture || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestKey)) return null
  if (fixture.contractVersion === 'public-research-start.v1') {
    if (fixture.mode === 'LIVE' && requestKey !== fixture.requestKey) return null
    return { requestKey, expectedUpdatedAt: data.basis.updatedAt, acquisitionProfile: data.configuration.coverage,
      researchConfiguration: fixture.selector,
      publicResearch: fixture.mode === 'OFFLINE' ? { mode: 'OFFLINE', fixture: { fixtureId: fixture.fixture.fixtureId,
        fixtureVersion: fixture.fixture.fixtureVersion, fixtureFileSha256: fixture.fixture.fixtureFileSha256 } } : { mode: 'LIVE', releaseId: fixture.requestKey },
      ...(fixture.mode === 'OFFLINE' ? { controlledReplay: { bindingId: fixture.fixture.controlledBindingId } } : {}) }
  }
  if (fixture.contractVersion === 'provider-free-search-start.v1') return { requestKey, expectedUpdatedAt: data.basis.updatedAt,
    researchConfiguration: fixture.selector, providerFreeSearch: { fixtureId: fixture.fixture.fixtureId,
      fixtureVersion: fixture.fixture.fixtureVersion, fixtureFileSha256: fixture.fixture.fixtureFileSha256 } }
  return { requestKey, expectedUpdatedAt: data.basis.updatedAt, acquisitionProfile: data.configuration.coverage,
    researchConfiguration: fixture.selector, controlledReplay: { bindingId: fixture.bindingId } }
}
