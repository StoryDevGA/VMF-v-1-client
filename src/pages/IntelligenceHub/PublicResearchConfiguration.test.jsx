import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PublicResearchConfiguration from './PublicResearchConfiguration.jsx'
import { PUBLIC_RESEARCH_SOURCES, initialResearchConfiguration, changeResearchJurisdiction,
  researchConfigurationProblem, readResearchAvailability } from './publicResearchConfiguration.js'

const brief = { companyName: 'Fixture company', companyWebsite: 'https://fixture.example',
  marketRegion: 'A bounded market', targetOffer: 'Fixture service', notes: 'Preserve qualifications.' }
const open = async user => {
  await user.click(screen.getByRole('checkbox', { name: 'Research public information' }))
  await user.click(screen.getByRole('button', { name: 'Configure research' }))
  return screen.getByRole('dialog', { name: 'Configure research' })
}

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
