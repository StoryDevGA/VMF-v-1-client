import { useEffect, useId, useRef, useState } from 'react'
import { Button, ButtonGroup } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { PUBLIC_RESEARCH_SOURCES, initialResearchConfiguration, changeResearchJurisdiction,
  researchPurpose, researchDraftMatchesSaved, RESEARCH_AVAILABILITY_MESSAGES, researchConfigurationProblem, savedResearchDraft,
  readResearchCapabilityMatrix, RESEARCH_CAPABILITY_LABELS } from './publicResearchConfiguration.js'

// Saving settings is deliberately separate from research execution.
export default function PublicResearchConfiguration({ brief, profile, canPrepare, onInspectAvailability,
  savedConfiguration, currency, availability, onSave, onStart, startAvailable = false, starting = false, saveAvailable = false, saving = false, saveError = '', readLoading = false, readUnavailable = false }) {
  const [selected, setSelected] = useState(Boolean(savedConfiguration))
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => initialResearchConfiguration(brief))
  const savedVersion = savedConfiguration?.configurationVersion || null
  const [displayedVersion, setDisplayedVersion] = useState(savedVersion)
  const trigger = useRef(null)
  const restoreFocus = useRef(false)
  const previousSavedVersion = useRef(savedVersion)
  const descriptionId = useId()
  if (displayedVersion !== savedVersion) {
    setDisplayedVersion(savedVersion); setSelected(Boolean(savedConfiguration)); setOpen(false)
  }
  useEffect(() => {
    if (previousSavedVersion.current !== savedVersion) {
      previousSavedVersion.current = savedVersion; restoreFocus.current = true
    }
    if (!open && restoreFocus.current) {
      restoreFocus.current = false
      if (trigger.current?.isConnected) trigger.current.focus()
    }
  }, [open, savedVersion])
  const close = () => { if (!saving) { restoreFocus.current = true; setOpen(false) } }
  const configure = event => {
    if (!canPrepare || !selected || saving) return
    trigger.current = event.currentTarget
    setDraft(savedConfiguration ? savedResearchDraft(savedConfiguration) : initialResearchConfiguration(brief))
    setOpen(true)
  }
  const change = changes => setDraft(previous => ({ ...previous, ...changes }))
  const jurisdiction = changes => setDraft(previous => changeResearchJurisdiction(previous, changes))
  const problem = researchConfigurationProblem(draft)
  const checkedAvailability = availability && researchDraftMatchesSaved(draft, savedConfiguration) ? availability : null
  const startDescriptor = checkedAvailability && (Object.hasOwn(checkedAvailability, 'researchStart') ? checkedAvailability.researchStart : checkedAvailability.fixtureStart)
  const capabilityMatrix = readResearchCapabilityMatrix(availability?.capabilityMatrix)
  return <section className="intelligence-hub__research-availability" aria-label="Public research availability">
    <div>
      <Tickbox label="Research public information" checked={selected} disabled={!canPrepare || saving}
        onKeyDown={event => { if (event.key === 'Enter') event.preventDefault() }}
        aria-describedby={descriptionId} onChange={event => { setSelected(event.target.checked); if (!event.target.checked) setOpen(false) }} />
      <p id={descriptionId}>{startDescriptor?.contractVersion === 'public-research-start.v1' && startDescriptor.eligible && startDescriptor.mode === 'LIVE' && startAvailable
        ? 'Prepare source choices from this brief. Start is limited to the server-issued research release; selecting or configuring settings does not start a run.'
        : 'Prepare source choices from this brief. Live research remains unavailable; selecting or configuring settings does not start a run.'}</p>
    </div>
    <Button type="button" size="sm" variant="outline" disabled={!canPrepare || !selected || saving} onClick={configure}>Configure research</Button>
    <Button type="button" size="sm" variant="outline" onClick={onInspectAvailability}>Research availability</Button>
    {readLoading ? <p role="status">Loading saved research configuration…</p> : readUnavailable ? <p role="alert">Saved configuration is unavailable. Reload before saving again.</p>
      : savedConfiguration ? <p role="status">Saved research configuration · {savedConfiguration.settings.sources.length} source categories · {savedConfiguration.savedAt}. Saving settings does not start a research run.</p> : null}
    {currency === 'STALE_BASIS' ? <p role="alert">Saved settings belong to an older revision basis. Review and save again against the current revision before any future execution.</p> : null}
    {saveError && !open ? <p role="alert">{saveError}</p> : null}
    {open && canPrepare && selected ? <Dialog open size="lg" onClose={close} aria-label="Configure research"
      onKeyDown={event => { if (event.key === 'Enter' && ['INPUT', 'SELECT'].includes(event.target.tagName)) event.preventDefault() }}>
      <Dialog.Header><h2>Configure research</h2></Dialog.Header>
      <Dialog.Body>
        {savedConfiguration ? <p>Research settings do not change the Context brief or evidence.</p> : null}
        <dl className="intelligence-hub__inspection-facts">
          <div><dt>Company / trading name</dt><dd>{brief.companyName}</dd></div>
          <div><dt>Inherited coverage</dt><dd>{profile === 'ENHANCED' ? 'Enhanced' : profile === 'STANDARD' ? 'Standard' : 'Unavailable'}</dd></div>
          <div><dt>Research purpose from Context</dt><dd>{researchPurpose(brief)}</dd></div>
        </dl>
        <Textarea label="Starting URLs · one per line" size="sm" fullWidth disabled={saving} maxLength={5010} value={draft.startingUrls}
          onChange={event => change({ startingUrls: event.target.value })} />
        {startAvailable && startDescriptor?.newsCapture?.contractVersion === 'public-research-news-capture.v2'
          ? <p>News article in this release: {startDescriptor.newsCapture.articleUrl}. Other listed pages are Website captures. Public search results remain discovery metadata.</p> : null}
        <Fieldset><Fieldset.Legend>Entity and jurisdiction</Fieldset.Legend><Fieldset.Content>
          <Input id={`${descriptionId}-entity`} label="Legal entity or UK subsidiary name" size="sm" fullWidth disabled={saving} maxLength={255} value={draft.legalEntity} onChange={event => jurisdiction({ legalEntity: event.target.value })} />
          <Input id={`${descriptionId}-country`} label="Country code" helperText="Two-letter code, for example GB. Leave blank if unresolved." size="sm" fullWidth disabled={saving} maxLength={2} placeholder="GB" value={draft.countryCode} onChange={event => jurisdiction({ countryCode: event.target.value.toUpperCase() })} />
          <Input id={`${descriptionId}-identifier`} label="Entity identifier · if known" size="sm" fullWidth disabled={saving} maxLength={160} value={draft.entityIdentifier} onChange={event => jurisdiction({ entityIdentifier: event.target.value })} />
          <Tickbox label="This configuration explicitly targets a UK subsidiary" disabled={saving} checked={draft.ukSubsidiary} onChange={event => jurisdiction({ ukSubsidiary: event.target.checked })} />
          <Tickbox label="I confirm this entity and country for configuration" disabled={saving || !draft.legalEntity.trim() || (!draft.countryCode && !draft.ukSubsidiary)} checked={draft.entityConfirmed}
            onChange={event => jurisdiction({ entityConfirmed: event.target.checked })} />
          <p>Confirmation is your configuration choice, not verified legal identity. Ambiguous names remain unresolved; no namesake record can become evidence.</p>
        </Fieldset.Content></Fieldset>
        <Fieldset><Fieldset.Legend>Public source categories</Fieldset.Legend><Fieldset.Content>
          <p>Selecting a source does not authorise access. A current release must cover public access, licensing, retention, region and spend. Private, authenticated or prohibited collection stays blocked.</p>
          {PUBLIC_RESEARCH_SOURCES.map(source => {
            const capability = checkedAvailability?.categories.find(item => item.key === source.key)
            const method = capabilityMatrix?.categories.find(item => item.key === source.key)
            const available = capability?.selected && capability.status === 'GATED'
              && capability.reason === 'OPERATING_APPROVAL_NOT_RECORDED' && startAvailable && startDescriptor?.eligible
            const checked = draft.sources.includes(source.key)
            return <div key={source.key}>
              <Tickbox label={source.label} disabled={saving} checked={checked} onChange={event => change({ sources: event.target.checked ? [...draft.sources, source.key] : draft.sources.filter(key => key !== source.key) })} />
              <p>{available ? startDescriptor.mode === 'LIVE' ? 'Available under the current operating release.' : 'Available for the registered offline fixture.'
                : capability ? `${({ NOT_SELECTED: 'Not selected', GATED: 'Gated', UNAVAILABLE: 'Unavailable', NOT_APPLICABLE: 'Not applicable' })[capability.status]} — ${RESEARCH_AVAILABILITY_MESSAGES[capability.reason]}` : 'Save settings to check availability.'}</p>
              {method ? <p>{RESEARCH_CAPABILITY_LABELS[method.implementation]} · {method.method}. {method.limitation}</p> : null}
              <p>{source.boundary}</p>
            </div>
          })}
        </Fieldset.Content></Fieldset>
        <Textarea label="Optional narrowing instructions" size="sm" fullWidth disabled={saving} maxLength={2000} value={draft.instructions} onChange={event => change({ instructions: event.target.value })} />
        <p>Instructions can narrow the task. They cannot override governed methods or authorise private/internal access.</p>
        {problem ? <p role="alert">{problem}</p> : null}
        {saveError ? <p role="alert">{saveError}</p> : null}
        <p>{checkedAvailability && Object.hasOwn(checkedAvailability, 'researchStart') ? startDescriptor?.eligible && startAvailable ? startDescriptor.mode === 'LIVE' ? 'This server-issued release is available only for the current saved configuration.' : 'Only the registered offline Public Research fixture is available. Live research remains unavailable.' : 'Public Research remains blocked or unavailable for the current saved configuration.' : checkedAvailability ? RESEARCH_AVAILABILITY_MESSAGES[checkedAvailability.reason] : 'Save settings to check availability. Changes have not been checked by the server.'}</p>
        {checkedAvailability?.requestMapping ? <p>Saved request mapped · {profile === 'ENHANCED' ? 'Enhanced' : 'Standard'} coverage · {checkedAvailability.requestMapping.settings.sources.length} selected categories. This does not start research.</p> : null}
        <p>{startDescriptor?.eligible && startAvailable ? startDescriptor.contractVersion === 'public-research-start.v1'
          ? startDescriptor.mode === 'OFFLINE'
            ? 'Start runs the registered offline search, registry and controlled-source fixture for the selected categories. Original captured assertions remain pending review; search discoveries and registry matches are not accepted evidence. No live provider will run.'
            : 'Start uses only the server-issued single-run release and its limits. Results remain qualified and require separate review; no evidence is automatically accepted.'
          : startDescriptor.contractVersion === 'provider-free-search-start.v1'
          ? 'Start records only the registered provider-free search fixture receipt. No sources or evidence will be saved. No live provider or registry will run.'
          : 'Start runs only the registered provider-free fixture. No live provider or registry will run.' : 'Live research remains unavailable.'} Saving settings does not retrieve sources, spend money, accept evidence or create a Run.</p>
      </Dialog.Body>
      <Dialog.Footer>
        <ButtonGroup stackOnMobile fullWidthOnMobile align="end" aria-label="Research configuration actions">
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={close}>Cancel configuration</Button>
        <Button type="button" size="sm" variant="outline" loading={saving} disabled={!canPrepare || !saveAvailable || Boolean(problem)} onClick={() => { if (canPrepare && saveAvailable && !saving && !problem) onSave?.(draft) }}>Save research configuration</Button>
        <Button type="button" size="sm" loading={starting} disabled={!startAvailable || !startDescriptor?.eligible || Boolean(problem) || saving || starting} onClick={() => { if (startAvailable && startDescriptor?.eligible && !problem && !saving && !starting) { onStart?.(); setOpen(false) } }}>Start research</Button>
        </ButtonGroup>
      </Dialog.Footer>
    </Dialog> : null}
  </section>
}
