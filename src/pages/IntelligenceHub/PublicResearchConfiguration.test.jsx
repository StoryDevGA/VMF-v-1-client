import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PublicResearchConfiguration from './PublicResearchConfiguration.jsx'
import { PUBLIC_RESEARCH_SOURCES, initialResearchConfiguration, changeResearchJurisdiction,
  researchConfigurationProblem, readResearchAvailability, readResearchCapabilityMatrix } from './publicResearchConfiguration.js'

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
  if (kind === 'implementation') matrix.categories.find(row => row.key === 'GITHUB').implementation = 'NATIVE_GATED'
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
  expect(within(dialog).getAllByText(/Internal test capture only/)).toHaveLength(2)
  await user.click(within(dialog).getByRole('checkbox', { name: 'GitHub', exact: true }))
  expect(within(dialog).getByRole('button', { name: 'Start research' })).toBeDisabled()
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
  expect(screen.getAllByText(/Internal test capture only/)).toHaveLength(2)
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
