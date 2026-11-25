import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PublicResearchConfiguration from './PublicResearchConfiguration.jsx'
import { PUBLIC_RESEARCH_SOURCES, initialResearchConfiguration, changeResearchJurisdiction,
  researchConfigurationProblem, readResearchAvailability, readResearchCapabilityMatrix, readFixtureStart, buildFixtureStartPayload } from './publicResearchConfiguration.js'

// Test-only parity read; production data comes from the authenticated API.
const capabilityMatrix = JSON.parse(readFileSync(resolve(process.cwd(), '../VMF-v-1-api/src/runtime-contracts/public-research-capability-matrix.v1.json'), 'utf8'))

const brief = { companyName: 'Fixture company', companyWebsite: 'https://fixture.example',
  marketRegion: 'A bounded market', targetOffer: 'Fixture service', notes: 'Preserve qualifications.' }
const open = async user => {
  await user.click(screen.getByRole('checkbox', { name: 'Research public information' }))
  await user.click(screen.getByRole('button', { name: 'Configure research' }))
  return screen.getByRole('dialog', { name: 'Configure research' })
}

const catalogueAvailability = matrix => ({ contractVersion: 'public-research-availability.v1', canStart: false,
  executionEnabled: false, reason: 'CONFIGURATION_NOT_RECORDED', configurationVersion: null, configurationHash: null,
  categories: PUBLIC_RESEARCH_SOURCES.map(source => ({ key: source.key, selected: false,
    status: 'NOT_SELECTED', reason: 'SOURCE_NOT_SELECTED' })), requestMapping: null,
  ...(matrix === undefined ? {} : { capabilityMatrix: matrix }) })

it('accepts the actual server catalogue and preserves legacy missing metadata without inventing support', () => {
  expect(readResearchCapabilityMatrix(capabilityMatrix)).toEqual(capabilityMatrix)
  expect(readResearchAvailability({ configuration: null, availability: catalogueAvailability(capabilityMatrix) })).not.toBeNull()
  const legacy = readResearchAvailability({ configuration: null, availability: catalogueAvailability() })
  expect(legacy).not.toBeNull(); expect(legacy.capabilityMatrix).toBeUndefined()
})

it.each(['version', 'missing', 'duplicate', 'unknown', 'implementation', 'permit', 'long-text', 'array-key', 'blank'])('rejects malformed present catalogue %s before it can inform Start', kind => {
  const matrix = structuredClone(capabilityMatrix)
  if (kind === 'version') matrix.contractVersion = 'public-research-capability-matrix.v2'
  if (kind === 'missing') matrix.categories.pop()
  if (kind === 'duplicate') matrix.categories[1] = { ...matrix.categories[0] }
  if (kind === 'unknown') matrix.categories[0].key = 'PRIVATE'
  if (kind === 'implementation') matrix.categories.find(row => row.key === 'GITHUB').implementation = 'UNAVAILABLE'
  if (kind === 'permit') matrix.canStart = true
  if (kind === 'long-text') matrix.categories[0].limitation = 'a'.repeat(401)
  if (kind === 'array-key') matrix.categories[0].key = ['WEBSITE']
  if (kind === 'blank') matrix.categories[0].method = '  '
  expect(readResearchCapabilityMatrix(matrix)).toBeNull()
  expect(readResearchAvailability({ configuration: null, availability: catalogueAvailability(matrix) })).toBeNull()
})

it('shows server-owned methods separately from unchecked request readiness and never dispatches on selection', async () => {
  const user = userEvent.setup(), start = vi.fn(), save = vi.fn()
  render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare
    availability={catalogueAvailability(capabilityMatrix)} onStart={start} onSave={save} />)
  const dialog = await open(user)
  for (const row of capabilityMatrix.categories) expect(within(dialog).getByText(new RegExp(row.method.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeVisible()
  expect(within(dialog).queryByText(/Internal test capture only|synthetic material/)).not.toBeInTheDocument()
  for (const name of ['GitHub', 'LinkedIn', 'X and Instagram', 'Reviews', 'Industry sources']) {
    await user.click(within(dialog).getByRole('checkbox', { name, exact: true }))
    expect(within(dialog).getByRole('button', { name: 'Start research' })).toBeDisabled()
  }
  expect(start).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled()
})

it.each(['LIVE', 'OFFLINE'])('ready copy requires the existing verified caller flag for %s', async mode => {
  const user = userEvent.setup(), saved = { configurationVersion: 'saved-ready', savedAt: '2026-11-23T10:00:00Z',
    settings: { ...initialResearchConfiguration(brief), startingUrls: ['https://fixture.example'] } }
  const availability = { ...catalogueAvailability(capabilityMatrix), categories: PUBLIC_RESEARCH_SOURCES.map(source => ({
    key: source.key, selected: saved.settings.sources.includes(source.key), status: saved.settings.sources.includes(source.key) ? 'GATED' : 'NOT_SELECTED',
    reason: saved.settings.sources.includes(source.key) ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' })),
    researchStart: { eligible: true, mode } }
  const view = render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare
    savedConfiguration={saved} availability={availability} startAvailable={false} />)
  await user.click(screen.getByRole('button', { name: 'Configure research' }))
  expect(screen.queryByText(/Available under the current operating release|Available for the registered offline fixture/)).not.toBeInTheDocument()
  view.rerender(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare
    savedConfiguration={saved} availability={availability} startAvailable />)
  expect(screen.getAllByText(mode === 'LIVE' ? 'Available under the current operating release.' : 'Available for the registered offline fixture.')).toHaveLength(2)
  await user.click(screen.getByRole('checkbox', { name: 'GitHub', exact: true }))
  expect(screen.queryByText(/Available under the current operating release|Available for the registered offline fixture/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start research' })).toBeDisabled()
  expect(screen.queryByText(/Internal test capture only|synthetic material/)).not.toBeInTheDocument()
})

it('preserves selected non-UK registry N/A despite a verified eligible whole-run descriptor', async () => {
  const user = userEvent.setup(), settings = { ...initialResearchConfiguration(brief), startingUrls: ['https://fixture.example'],
    sources: ['WEBSITE', 'REGISTRY'], countryCode: 'US' }
  const saved = { configurationVersion: 'saved-registry', savedAt: '2026-11-23T10:00:00Z', settings }
  const availability = { ...catalogueAvailability(capabilityMatrix), categories: PUBLIC_RESEARCH_SOURCES.map(source => ({
    key: source.key, selected: settings.sources.includes(source.key), status: source.key === 'REGISTRY' ? 'NOT_APPLICABLE' : source.key === 'WEBSITE' ? 'GATED' : 'NOT_SELECTED',
    reason: source.key === 'REGISTRY' ? 'UK_REGISTRY_NOT_APPLICABLE' : source.key === 'WEBSITE' ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' })),
    researchStart: { eligible: true, mode: 'LIVE' } }
  render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare savedConfiguration={saved} availability={availability} startAvailable />)
  await user.click(screen.getByRole('button', { name: 'Configure research' }))
  expect(screen.getAllByText('Available under the current operating release.')).toHaveLength(1)
  expect(screen.getByText(/Not applicable — The initial UK registry path does not apply/)).toBeVisible()
})

describe('saved research configuration', () => {
  it.each(['STANDARD', 'ENHANCED'])('inherits %s and derives purpose without creating or submitting a run', async profile => {
    const user = userEvent.setup(), submit = vi.fn(event => event.preventDefault()), save = vi.fn()
    render(<form onSubmit={submit}><PublicResearchConfiguration brief={brief} profile={profile} canPrepare saveAvailable onSave={save} onInspectAvailability={vi.fn()} /></form>)
    expect(screen.getByRole('button', { name: 'Configure research' })).toBeDisabled()
    const dialog = await open(user)
    expect(within(dialog).getByText(profile === 'ENHANCED' ? 'Enhanced' : 'Standard')).toBeVisible()
    expect(within(dialog).getByText(/Product or service: Fixture service/)).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Start research' })).toBeDisabled()
    for (const source of PUBLIC_RESEARCH_SOURCES) {
      expect(within(dialog).getByRole('checkbox', { name: source.label })).toBeInTheDocument()
      expect(within(dialog).getByText(source.label, { exact: true })).toBeVisible()
    }
    expect(within(dialog).getByRole('checkbox', { name: 'Official corporate registry' })).not.toBeChecked()
    await user.type(within(dialog).getByLabelText('Legal entity or UK subsidiary name'), 'Fixture Ltd{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Save research configuration' }))
    expect(save).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Saved research configuration ·/)).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Research public information' })).toBeChecked()
    expect(submit).not.toHaveBeenCalled()
  })
  it('reopens the server-saved draft after cancelling edits and returns focus', async () => {
    const user = userEvent.setup(), saved = { configurationVersion: 'saved-1', savedAt: '2026-11-12T10:00:00Z', settings: { ...initialResearchConfiguration(brief), startingUrls: ['https://fixture.example'], instructions: 'Keep originals.' } }
    render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare savedConfiguration={saved} />)
    await user.click(screen.getByRole('button', { name: 'Configure research' }))
    await user.clear(screen.getByLabelText('Optional narrowing instructions'))
    await user.type(screen.getByLabelText('Optional narrowing instructions'), 'Discard this edit')
    await user.click(screen.getByRole('button', { name: 'Cancel configuration' }))
    expect(screen.getByRole('button', { name: 'Configure research' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Configure research' }))
    expect(screen.getByLabelText('Optional narrowing instructions')).toHaveValue('Keep originals.')
    expect(screen.getByRole('button', { name: 'Save research configuration' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Start research' })).toBeDisabled()
  })
  it('resets registry default when confirmed UK identity changes and supports an explicit UK subsidiary', () => {
    let config = initialResearchConfiguration(brief)
    config = changeResearchJurisdiction(config, { legalEntity: 'Fixture Ltd', countryCode: 'GB' })
    expect(config.sources).not.toContain('REGISTRY')
    config = changeResearchJurisdiction(config, { entityConfirmed: true })
    expect(config.sources).toContain('REGISTRY')
    config = changeResearchJurisdiction(config, { countryCode: 'IE' })
    expect(config.entityConfirmed).toBe(false)
    expect(config.sources).not.toContain('REGISTRY')
    config = changeResearchJurisdiction(config, { ukSubsidiary: true })
    config = changeResearchJurisdiction(config, { entityConfirmed: true })
    expect(config.sources).toContain('REGISTRY')
  })
  it('requires confirmation without inferring UK jurisdiction from the market text', async () => {
    const user = userEvent.setup()
    render(<PublicResearchConfiguration brief={{ ...brief, marketRegion: 'United Kingdom' }} profile="STANDARD" canPrepare />)
    const dialog = await open(user)
    expect(within(dialog).getByLabelText('Country code')).toHaveValue('')
    await user.type(within(dialog).getByLabelText('Legal entity or UK subsidiary name'), 'Fixture Ltd')
    await user.type(within(dialog).getByLabelText('Country code'), 'gb')
    await user.click(within(dialog).getByLabelText('I confirm this entity and country for configuration'))
    expect(within(dialog).getByLabelText('Official corporate registry')).toBeChecked()
    await user.type(within(dialog).getByLabelText('Entity identifier · if known'), '123')
    expect(within(dialog).getByLabelText('Official corporate registry')).not.toBeChecked()
    expect(within(dialog).getByLabelText('I confirm this entity and country for configuration')).not.toBeChecked()
  })
  it.each(['', 'javascript:alert(1)', 'https://user:secret@fixture.example', 'relative/path'])('rejects invalid starting URLs %s', startingUrls => {
    expect(researchConfigurationProblem({ ...initialResearchConfiguration(brief), startingUrls })).toBeTruthy()
  })
  it('bounds URLs, jurisdiction and selection without dispatching', () => {
    const config = initialResearchConfiguration(brief)
    expect(researchConfigurationProblem({ ...config, startingUrls: Array.from({ length: 11 }, (_, i) => `https://fixture.example/${i}`).join('\n') })).toMatch(/up to 10/)
    expect(researchConfigurationProblem({ ...config, countryCode: 'UKK' })).toMatch(/two-letter/)
    expect(researchConfigurationProblem({ ...config, sources: [] })).toMatch(/at least one/)
  })
  it('keeps preparation disabled when parent authority is unavailable', () => {
    render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare={false} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Research public information' }))
    expect(screen.getByRole('button', { name: 'Configure research' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

it('uses saved server category states and invalidates them immediately after a local edit', async () => {
 const user = userEvent.setup(), saved = { configurationVersion: 'saved-1', savedAt: '2026-11-12T10:00:00Z', settings: { ...initialResearchConfiguration(brief), startingUrls: ['https://fixture.example'] } }
 const availability = { reason: 'OPERATING_APPROVAL_NOT_RECORDED', categories: PUBLIC_RESEARCH_SOURCES.map(source => ({ key: source.key, status: source.key === 'WEBSITE' ? 'UNAVAILABLE' : 'NOT_SELECTED', reason: source.key === 'WEBSITE' ? 'SOURCE_UNSUPPORTED' : 'SOURCE_NOT_SELECTED' })), requestMapping: { settings: saved.settings } }
 render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare savedConfiguration={saved} availability={availability} />)
 await user.click(screen.getByRole('button', { name: 'Configure research' }))
 expect(screen.getByText('Unavailable — This category has no supported execution path in this environment.')).toBeVisible()
 expect(screen.getByText(/Saved request mapped/)).toBeVisible()
 await user.type(screen.getByLabelText('Optional narrowing instructions'), 'Narrower scope')
 expect(screen.queryByText(/Saved request mapped/)).not.toBeInTheDocument()
 expect(screen.queryByText('Unavailable — This category has no supported execution path in this environment.')).not.toBeInTheDocument()
 expect(screen.getAllByText('Save settings to check availability.')).toHaveLength(9)
 expect(screen.getByRole('button', { name: 'Start research' })).toBeDisabled()
})
it.each([undefined, {}, { contractVersion: 'public-research-availability.v1', canStart: true }])('rejects missing or malformed server availability %j', availability => {
 expect(readResearchAvailability({ configuration: null, availability })).toBeNull()
})

it.each(['eligible', 'unavailable', 'dirty'])('starts only the unchanged explicitly eligible fixture: %s', async state => {
 const user = userEvent.setup(), onStart = vi.fn(), saved = { configurationVersion: 'saved-1', savedAt: '2026-11-12T10:00:00Z', settings: { ...initialResearchConfiguration(brief), startingUrls: ['https://fixture.example'] } }
 const availability = { reason: 'OPERATING_APPROVAL_NOT_RECORDED', categories: PUBLIC_RESEARCH_SOURCES.map(source => ({ key: source.key, status: 'UNAVAILABLE', reason: 'SOURCE_UNSUPPORTED' })), requestMapping: { settings: saved.settings }, fixtureStart: { eligible: state !== 'unavailable' } }
 render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare savedConfiguration={saved} availability={availability} startAvailable onStart={onStart} />)
 await user.click(screen.getByRole('button', { name: 'Configure research' }))
 expect(screen.getByText('Prepare source choices from this brief. Live research remains unavailable; selecting or configuring settings does not start a run.')).toBeVisible()
 expect(screen.queryByText(/No research run has started/i)).not.toBeInTheDocument()
 expect(screen.getByText(/Saving settings does not start a research run/)).toBeVisible()
 expect(onStart).not.toHaveBeenCalled()
 if (state === 'dirty') await user.type(screen.getByLabelText('Optional narrowing instructions'), 'Changed')
 const start = screen.getByRole('button', { name: 'Start research' })
 if (state === 'eligible') { expect(start).toBeEnabled(); await user.click(start); expect(onStart).toHaveBeenCalledOnce(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument() }
 else { expect(start).toBeDisabled(); expect(onStart).not.toHaveBeenCalled() }
})
it('does not infer that no run exists from an unavailable settings read', () => {
 render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare readUnavailable />)
 expect(screen.getByRole('alert')).toHaveTextContent('Saved configuration is unavailable. Reload before saving again.')
 expect(screen.queryByText(/No research run has started/i)).not.toBeInTheDocument()
})

it('describes an eligible search fixture as receipt-only and keeps edits from starting it', async () => {
 const user = userEvent.setup(), onStart = vi.fn(), saved = { configurationVersion: 'saved-search', savedAt: '2026-11-13T09:00:00Z',
  settings: { ...initialResearchConfiguration(brief), sources: ['SEARCH'], startingUrls: ['https://www.trilogywebsolutions.co.uk/clients/'] } }
 const availability = { reason: 'OPERATING_APPROVAL_NOT_RECORDED', categories: PUBLIC_RESEARCH_SOURCES.map(source => ({ key: source.key,
  status: source.key === 'SEARCH' ? 'GATED' : 'NOT_SELECTED', reason: source.key === 'SEARCH' ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' })),
  requestMapping: { settings: saved.settings }, fixtureStart: { contractVersion: 'provider-free-search-start.v1', eligible: true } }
 render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare savedConfiguration={saved} availability={availability} startAvailable onStart={onStart} />)
 await user.click(screen.getByRole('button', { name: 'Configure research' }))
 expect(screen.getByText(/Start records only the registered provider-free search fixture receipt. No sources or evidence will be saved/)).toBeVisible()
 expect(onStart).not.toHaveBeenCalled()
 await user.type(screen.getByLabelText('Optional narrowing instructions'), ' changed')
 expect(screen.getByRole('button', { name: 'Start research' })).toBeDisabled()
 expect(screen.queryByText(/Start records only the registered provider-free search fixture receipt/)).not.toBeInTheDocument()
 expect(onStart).not.toHaveBeenCalled()
})

it.each(['OFFLINE', 'LIVE', 'BLOCKED'])('uses the current PUBLIC %s capability without falling back to an older fixture', async mode => {
 const user = userEvent.setup(), onStart = vi.fn(), saved = {configurationVersion: 'public-saved', savedAt: '2026-11-16T10:00:00Z',
  settings: {...initialResearchConfiguration(brief), sources: ['SEARCH', 'WEBSITE', 'REGISTRY'], startingUrls: ['https://controlled-context.example/case-study']}}
 const researchStart = mode === 'BLOCKED' ? {contractVersion: 'public-research-start.v1', eligible: false, mode: 'LIVE', liveExecutionEnabled: false, reason: 'OPERATING_APPROVAL_NOT_RECORDED'}
  : {contractVersion: 'public-research-start.v1', eligible: true, mode, liveExecutionEnabled: mode === 'LIVE'}
 const availability = {reason: 'OPERATING_APPROVAL_NOT_RECORDED', categories: PUBLIC_RESEARCH_SOURCES.map(source => ({key: source.key, status: 'GATED', reason: 'OPERATING_APPROVAL_NOT_RECORDED'})),
  requestMapping: {settings: saved.settings}, researchStart, fixtureStart: {eligible: true}}
 render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare savedConfiguration={saved} availability={availability} startAvailable onStart={onStart} />)
 await user.click(screen.getByRole('button', {name: 'Configure research'}))
 expect(onStart).not.toHaveBeenCalled()
 if (mode === 'BLOCKED') {
  expect(screen.getByRole('button', {name: 'Start research'})).toBeDisabled()
  expect(screen.queryByText(/Start runs only the registered provider-free fixture/)).not.toBeInTheDocument()
 } else {
  expect(screen.getByText(mode === 'OFFLINE' ? /Start runs the registered offline search, registry and controlled-source fixture/
   : /Start uses only the server-issued single-run release and its limits/)).toBeVisible()
  expect(screen.queryByText('Provider/registry operating approval is not recorded. No retrieval will run.')).not.toBeInTheDocument()
  expect(screen.getByText(mode === 'LIVE' ? 'This server-issued release is available only for the current saved configuration.' : 'Only the registered offline Public Research fixture is available. Live research remains unavailable.')).toBeVisible()
  await user.click(screen.getByRole('button', {name: 'Start research'}))
  expect(onStart).toHaveBeenCalledOnce()
 }
})

it('withdraws PUBLIC Start when the prepared settings stop matching the saved capability', async () => {
 const user = userEvent.setup(), onStart = vi.fn(), saved = {configurationVersion: 'public-saved', savedAt: '2026-11-16T10:00:00Z',
  settings: {...initialResearchConfiguration(brief), startingUrls: ['https://controlled-context.example/case-study']}}
 const availability = {reason: 'OPERATING_APPROVAL_NOT_RECORDED', categories: PUBLIC_RESEARCH_SOURCES.map(source => ({key: source.key, status: 'GATED', reason: 'OPERATING_APPROVAL_NOT_RECORDED'})),
  requestMapping: {settings: saved.settings}, researchStart: {contractVersion: 'public-research-start.v1', eligible: true, mode: 'OFFLINE', liveExecutionEnabled: false}}
 render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare savedConfiguration={saved} availability={availability} startAvailable onStart={onStart} />)
 await user.click(screen.getByRole('button', {name: 'Configure research'}))
 expect(screen.getByRole('button', {name: 'Start research'})).toBeEnabled()
 await user.type(screen.getByLabelText('Optional narrowing instructions'), ' changed')
 expect(screen.getByRole('button', {name: 'Start research'})).toBeDisabled()
 expect(onStart).not.toHaveBeenCalled()
})


const nativeNewsConfiguration = () => {
  const scope = { customerId: '1'.repeat(24), tenantId: '2'.repeat(24), runtimeInstanceId: '3'.repeat(24), runtimeInstanceKey: 'unit-news' }
  const basis = { stateVersion: 'unit-state', updatedAt: '2026-11-24T12:00:00.000Z' }
  const configuration = { configurationVersion: '11111111-1111-4111-8111-111111111111', configurationHash: 'sha256:' + 'a'.repeat(64),
    saveAuditId: '4'.repeat(24), savedBy: '5'.repeat(24), contextSource: 'USER_PREPARED_CONTEXT_BRIEF', context: brief,
    purpose: 'Unit News only', coverage: 'STANDARD', settings: { ...initialResearchConfiguration(brief),
      sources: ['NEWS'], startingUrls: ['https://unit.example/news'] } }
  const availability = { ...catalogueAvailability(capabilityMatrix), reason: 'OPERATING_APPROVAL_NOT_RECORDED',
    configurationVersion: configuration.configurationVersion, configurationHash: configuration.configurationHash,
    categories: PUBLIC_RESEARCH_SOURCES.map(({ key }) => ({ key, selected: key === 'NEWS',
      status: key === 'NEWS' ? 'GATED' : 'NOT_SELECTED', reason: key === 'NEWS' ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' })),
    requestMapping: { contractVersion: 'public-research-request-mapping.v1', configurationVersion: configuration.configurationVersion,
      configurationHash: configuration.configurationHash, saveAuditId: configuration.saveAuditId,
      scope, basis, contextSource: configuration.contextSource, inputs: configuration.context, purpose: configuration.purpose,
      acquisitionProfile: 'STANDARD', settings: configuration.settings },
    researchStart: { contractVersion: 'public-research-start.v1', eligible: true, mode: 'LIVE', liveExecutionEnabled: true,
      classification: 'NATIVE_PUBLIC_RESEARCH', actorUserId: configuration.savedBy, scope, basis,
      selector: { configurationVersion: configuration.configurationVersion, configurationHash: configuration.configurationHash, basisStateVersion: basis.stateVersion },
      requestKey: '22222222-2222-4222-8222-222222222222' } }
  return { configuration, availability, scope, basis, currency: 'CURRENT_BASIS', editable: true }
}
it('reads exact native News capability and builds only the existing release selector', () => {
  const data = nativeNewsConfiguration(), start = readFixtureStart(data)
  expect(start).toBe(data.availability.researchStart)
  const payload = buildFixtureStartPayload(data, start.requestKey)
  expect(payload.publicResearch).toEqual({ mode: 'LIVE', releaseId: start.requestKey })
  expect(payload).not.toHaveProperty('settings'); expect(payload).not.toHaveProperty('responseText')
})

const combinedNewsConfiguration = () => {
  const data = nativeNewsConfiguration()
  data.configuration.settings.sources = ['WEBSITE', 'SEARCH', 'NEWS']
  data.configuration.settings.startingUrls = ['https://unit.example/', 'https://unit.example/about', 'https://unit.example/news']
  data.availability.categories = PUBLIC_RESEARCH_SOURCES.map(({ key }) => ({ key,
    selected: data.configuration.settings.sources.includes(key),
    status: data.configuration.settings.sources.includes(key) ? 'GATED' : 'NOT_SELECTED',
    reason: data.configuration.settings.sources.includes(key) ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' }))
  data.availability.researchStart.newsCapture = { contractVersion: 'public-research-news-capture.v2', articleUrl: 'https://unit.example/news' }
  return data
}

it('reads an explicitly assigned combined News target without adding target data to dispatch', () => {
  const data = combinedNewsConfiguration(), start = readFixtureStart(data)
  expect(start).toBe(data.availability.researchStart)
  const payload = buildFixtureStartPayload(data, start.requestKey)
  expect(payload.publicResearch).toEqual({ mode: 'LIVE', releaseId: start.requestKey })
  expect(payload).not.toHaveProperty('newsCapture')
})

it('shows the declared News article only while the current draft matches its saved release', async () => {
  const user = userEvent.setup(), data = combinedNewsConfiguration()
  render(<PublicResearchConfiguration brief={brief} profile="STANDARD" canPrepare savedConfiguration={data.configuration}
    currency={data.currency} availability={data.availability} startAvailable onStart={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Configure research' }))
  expect(screen.getByText(/News article in this release:/)).toHaveTextContent('https://unit.example/news')
  expect(screen.getByText(/Other listed pages are Website captures/)).toBeVisible()
  await user.type(screen.getByLabelText('Optional narrowing instructions'), ' changed')
  expect(screen.queryByText(/News article in this release:/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start research' })).toBeDisabled()
})

it.each(['unlisted article', 'first URL', 'missing marker', 'old marker', 'wrong actor', 'missing Search'])(
  'refuses a combined Start with %s', kind => {
    const data = combinedNewsConfiguration()
    if (kind === 'unlisted article') data.availability.researchStart.newsCapture.articleUrl = 'https://unit.example/other'
    if (kind === 'first URL') data.availability.researchStart.newsCapture.articleUrl = data.configuration.settings.startingUrls[0]
    if (kind === 'missing marker') delete data.availability.researchStart.newsCapture
    if (kind === 'old marker') data.availability.researchStart.newsCapture.contractVersion = 'public-research-news-capture.v1'
    if (kind === 'wrong actor') data.availability.researchStart.actorUserId = '6'.repeat(24)
    if (kind === 'missing Search') data.configuration.settings.sources = ['WEBSITE', 'NEWS']
    expect(readFixtureStart(data)).toBeNull()
  })
it.each(['offline', 'mixed', 'two URLs', 'http', 'credentials', 'query', 'blocked', 'wrong actor'])(
  'refuses unsupported News capability: %s', kind => {
    const data = nativeNewsConfiguration(), record = data.configuration, start = data.availability.researchStart
    if (kind === 'offline') { start.mode = 'OFFLINE'; start.liveExecutionEnabled = false; start.classification = 'CONTROLLED_PROVIDER_FREE_RESEARCH' }
    if (kind === 'mixed') {
      record.settings.sources.push('WEBSITE')
      Object.assign(data.availability.categories.find(row => row.key === 'WEBSITE'), { selected: true, status: 'GATED', reason: 'OPERATING_APPROVAL_NOT_RECORDED' })
    }
    if (kind === 'two URLs') record.settings.startingUrls.push('https://unit.example/other')
    if (kind === 'http') record.settings.startingUrls = ['http://unit.example/news']
    if (kind === 'credentials') record.settings.startingUrls = ['https://user:pass@unit.example/news']
    if (kind === 'query') record.settings.startingUrls = ['https://unit.example/news?next=other']
    if (kind === 'blocked') start.eligible = false
    if (kind === 'wrong actor') start.actorUserId = '6'.repeat(24)
    expect(readFixtureStart(data)).toBeNull()
  })


const githubUnitIdentity = { contractVersion: 'public-research-github-capture.v1', owner: 'unit-owner', repository: 'unit-repo', path: 'README.md', commit: 'a'.repeat(40) }
const nativeGithubConfiguration = () => {
  const data = nativeNewsConfiguration(), record = data.configuration, start = data.availability.researchStart
  record.settings.sources = ['GITHUB']
  record.settings.startingUrls = ['https://api.github.com/repos/unit-owner/unit-repo/contents/README.md?ref=' + 'a'.repeat(40)]
  data.availability.categories.forEach(category => Object.assign(category, { selected: category.key === 'GITHUB',
    status: category.key === 'GITHUB' ? 'GATED' : 'NOT_SELECTED',
    reason: category.key === 'GITHUB' ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' }))
  start.githubCapture = { ...githubUnitIdentity }
  return data
}
it('reads the exact GitHub Start descriptor without sending category identity as client authority', () => {
  const data = nativeGithubConfiguration(), start = readFixtureStart(data)
  expect(start).toBe(data.availability.researchStart)
  const payload = buildFixtureStartPayload(data, start.requestKey)
  expect(payload.publicResearch).toEqual({ mode: 'LIVE', releaseId: start.requestKey })
  expect(payload).not.toHaveProperty('githubCapture'); expect(payload).not.toHaveProperty('settings')
})
it.each(['missing marker', 'branch', 'path', 'URL', 'mixed sources', 'extra field', 'offline'])('rejects invalid GitHub Start %s', kind => {
  const data = nativeGithubConfiguration(), start = data.availability.researchStart
  if (kind === 'missing marker') delete start.githubCapture
  if (kind === 'branch') start.githubCapture.commit = 'main'
  if (kind === 'path') start.githubCapture.path = '../private'
  if (kind === 'URL') data.configuration.settings.startingUrls[0] += '&extra=1'
  if (kind === 'mixed sources') data.configuration.settings.sources.push('WEBSITE')
  if (kind === 'extra field') start.githubCapture.token = 'unit-only'
  if (kind === 'offline') start.mode = 'OFFLINE'
  expect(readFixtureStart(data)).toBeNull()
})

const nativeIndustryConfiguration = () => {
  const data = nativeGithubConfiguration(), record = data.configuration, start = data.availability.researchStart
  delete start.githubCapture
  record.settings.sources = ['INDUSTRY']
  record.settings.startingUrls = ['https://www.gov.uk/government/statistics/unit-release/unit-release']
  data.availability.categories.forEach(category => Object.assign(category, { selected: category.key === 'INDUSTRY',
    status: category.key === 'INDUSTRY' ? 'GATED' : 'NOT_SELECTED',
    reason: category.key === 'INDUSTRY' ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' }))
  start.industryCapture = { contractVersion: 'public-research-industry-capture.v1', reportUrl: record.settings.startingUrls[0],
    reportingPeriodQuote: 'at the start of 2026', reportCaveatQuote: 'official statistics in development' }
  return data
}
it('reads exact Industry Start without sending source permission or metadata as client authority', () => {
  const data = nativeIndustryConfiguration(), start = readFixtureStart(data)
  expect(start).toBe(data.availability.researchStart)
  const payload = buildFixtureStartPayload(data, start.requestKey)
  expect(payload.publicResearch).toEqual({ mode: 'LIVE', releaseId: start.requestKey })
  expect(payload).not.toHaveProperty('industryCapture'); expect(payload).not.toHaveProperty('settings')
})
it.each(['missing marker', 'missing period', 'missing caveat', 'foreign host', 'query', 'URL mismatch', 'mixed sources', 'extra field', 'GitHub marker', 'offline'])(
  'rejects inconsistent Industry Start: %s', kind => {
    const data = nativeIndustryConfiguration(), start = data.availability.researchStart
    if (kind === 'missing marker') delete start.industryCapture
    if (kind === 'missing period') start.industryCapture.reportingPeriodQuote = ''
    if (kind === 'missing caveat') start.industryCapture.reportCaveatQuote = ''
    if (kind === 'foreign host') start.industryCapture.reportUrl = 'https://other.example/government/statistics/unit-release/unit-release'
    if (kind === 'query') start.industryCapture.reportUrl += '?extra=1'
    if (kind === 'URL mismatch') data.configuration.settings.startingUrls[0] += '-other'
    if (kind === 'mixed sources') data.configuration.settings.sources.push('WEBSITE')
    if (kind === 'extra field') start.industryCapture.unproved = true
    if (kind === 'GitHub marker') start.githubCapture = githubUnitIdentity
    if (kind === 'offline') start.mode = 'OFFLINE'
    expect(readFixtureStart(data)).toBeNull()
  })
