import { useSearchParams } from 'react-router-dom'
import { selectAcquisitionAction } from '../../utils/discoveryAcquisition.js'
import { useEffect, useLayoutEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Button, ButtonGroup } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Dialog } from '../../components/Dialog'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiLock, FiPlus } from 'react-icons/fi'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { CUSTOMER_RESEARCH_ACCEPT, emptyCustomerResearchFields, customerResearchFileProblem,
  readCustomerResearchDeclaration, readCustomerReportUrl } from '../../utils/customerSuppliedResearch.js'
import { DISCOVERY_ACQUISITION_PROFILE_OPTIONS, DISCOVERY_ACQUISITION_PROFILE_GUIDANCE } from '../../constants/discoveryAcquisitionProfiles.js'
import { buildEmptyDiscoveryDraftInputs, normalizeWebsiteSourceDrafts, buildDiscoveryInputsPayload, buildDiscoveryContextReadiness, buildDiscoveryDocumentSource, DISCOVERY_DOCUMENT_ACCEPT, DISCOVERY_DOCUMENT_MAX_COUNT, DISCOVERY_WEBSITE_SOURCE_MAX_COUNT, DOCUMENT_EXTRACTION_HELPER_TEXT, DOCUMENT_EXTRACTION_STORAGE_NOTE, formatDocumentSize, formatIntelligenceHubEvidenceError } from '../../utils/discoveryAcquisition.js'
import { useExecuteRuntimeActionMutation, useUpdateRuntimeDiscoveryInputsMutation, useGetResearchConfigurationQuery, useSaveResearchConfigurationMutation, useGetAcquisitionRunsQuery } from '../../store/api/runtimeInstanceApi.js'
import { PUBLIC_RESEARCH_SOURCES, readSavedResearchConfiguration, readResearchAvailability, RESEARCH_AVAILABILITY_MESSAGES, researchContextSnapshot, readFixtureStart, buildFixtureStartPayload } from './publicResearchConfiguration.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import AcquisitionRunHistory from './AcquisitionRunHistory.jsx'
import CustomerResearchPrompt from './CustomerResearchPrompt.jsx'
import PublicResearchConfiguration from './PublicResearchConfiguration.jsx'
import PostLockSubmissionPanel from './PostLockSubmissionPanel.jsx'
import { sourceProcessingLabel, sourceProcessingExplanation } from './sourceSummaryModel.js'
import { acquisitionRunFromResponse, acquisitionRunFromError, acquisitionRunLabel, readAcquisitionRun, isAcquisitionRunId, isControlledAcquisitionRun, isProviderFreeSearchRun, isPublicResearchRun } from './acquisitionRunContract.js'

const draftFrom = (discovery) => ({ ...buildEmptyDiscoveryDraftInputs(), ...discovery?.inputValues, websiteSources: normalizeWebsiteSourceDrafts(discovery?.inputValues || {}) })

export default function ContextAcquisitionView(props) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const ownershipKey = JSON.stringify([props.contextKey, props.runtimeInstanceId, props.customerId, props.tenantId, sessionRevision])
  return <ScopedContextAcquisitionView key={ownershipKey} {...props} sessionRevision={sessionRevision} />
}

function ScopedContextAcquisitionView({ sessionRevision, discovery, renderer, authority, loading, locked, runtimeInstanceId, customerId, tenantId, contextKey, refresh, onSelectView, evidenceStatusCounts, countsLoading, sourceSummary, sourceSummaryLoading, active = true, availabilityReadAllowed = false, availabilityLoading = false, availabilityError, availabilityRoute = '' }) {
  const [params, setParams] = useSearchParams()
  const researchKeys = params.getAll('researchRequestKey')
  const researchKey = researchKeys.length === 1 && isAcquisitionRunId(researchKeys[0]) ? researchKeys[0] : null
  const [researchSubmitting, setResearchSubmitting] = useState(false), [researchFeedback, setResearchFeedback] = useState('')
  const researchRoute = useRef(researchKey)
  const latestParams = useRef(params)
  useLayoutEffect(() => { researchRoute.current = researchKey; latestParams.current = params }, [researchKey, params])
  const [execute] = useExecuteRuntimeActionMutation()
  const [updateInputs] = useUpdateRuntimeDiscoveryInputsMutation()
  const [draft, setDraft] = useState(() => draftFrom(discovery))
  const [editor, setEditor] = useState(null)
  const [websiteAddress, setWebsiteAddress] = useState('')
  const [inspection, setInspection] = useState(() => researchKeys.length || params.has('acquisitionRunId') ? 'Evidence intake and processing history' : null)
  const researchDescriptionId = useId()
  const briefHeader = useRef(null)
  const restoreEditorFocus = useRef(false)
  useEffect(() => { if (!editor && active && restoreEditorFocus.current) { briefHeader.current?.querySelector('button')?.focus(); restoreEditorFocus.current = false } }, [editor, active])
  const inspectionTrigger = useRef(null)
  const closeInspection = () => setInspection(null)
  const openInspection = (name, target) => { inspectionTrigger.current = target; setInspection(name) }
  useEffect(() => {
    if (!inspection && active && getSessionRevision() === sessionRevision) {
      const target = inspectionTrigger.current
      inspectionTrigger.current = null
      if (target?.isConnected) target.focus()
    }
  }, [inspection, active, sessionRevision])
  const [profile, setProfile] = useState(discovery?.acquisitionProfile || 'STANDARD')
  const [basis, setBasis] = useState(renderer?.runtimeInstance?.updatedAt)
  const [dirty, setDirty] = useState(false)
  const [documents, setDocuments] = useState([])
  const [reportMode, setReportMode] = useState(false)
  const [reportDelivery, setReportDelivery] = useState('file')
  const [reportUrl, setReportUrl] = useState('')
  const [reportFields, setReportFields] = useState(emptyCustomerResearchFields)
  const [preparing, setPreparing] = useState(false)
  const [fileError, setFileError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [pendingRequest, setPendingRequest] = useState(false)
  const [retryFrom, setRetryFrom] = useState(null)
  const request = useRef(null)
  const scope = { runtimeInstanceId, customerId, tenantId }
  const inFlight = useRef(false)
  const generation = useRef(0)
  const currentActive = useRef(active)
  currentActive.current = active
  const preparingRef = useRef(false)
  const preparation = useRef(0)
  const mounted = useRef(true)
  const isCurrent = () => mounted.current && getSessionRevision() === sessionRevision
  const researchCommandFrame = useRef(null)
  const researchCommandToken = Symbol('research-command-frame')
  useLayoutEffect(() => {
    researchCommandFrame.current = researchCommandToken
    return () => { if (researchCommandFrame.current === researchCommandToken) researchCommandFrame.current = null }
  })
  const ownsResearchCommand = () => researchCommandFrame.current === researchCommandToken && isCurrent()
  const fileInput = useRef(null)
  const status = useRef(null)
  const [saveConfiguration] = useSaveResearchConfigurationMutation()
  const [configurationSaving, setConfigurationSaving] = useState(false)
  const [configurationSaveError, setConfigurationSaveError] = useState('')
  const configurationRead = useGetResearchConfigurationQuery({ ...scope, sessionRevision }, {
    skip: !active || Boolean(loading) || locked || !runtimeInstanceId || !customerId || !tenantId,
  })
  const configurationData = !configurationRead.error ? readSavedResearchConfiguration(configurationRead.currentData, scope, renderer?.runtimeInstance?.stateVersion) : null
  const configurationReady = !loading && !configurationRead.isFetching && Boolean(configurationData)
    && configurationData.basis.updatedAt === renderer?.runtimeInstance?.updatedAt
  const latestConfiguration = useRef(null)
  latestConfiguration.current = configurationReady ? configurationData : null
  const savedConfiguration = configurationData?.configuration || null
  const savedBriefCurrent = savedConfiguration && profile === savedConfiguration.coverage
    && Object.entries(researchContextSnapshot(draft)).every(([key, value]) => savedConfiguration.context[key] === value)
  const researchAvailability = configurationReady && (!dirty || savedBriefCurrent) ? readResearchAvailability(configurationData) : null
  const fixtureStart = researchAvailability ? readFixtureStart(configurationData) : null
  const searchStart = fixtureStart?.contractVersion === 'provider-free-search-start.v1'
  const publicStart = fixtureStart?.contractVersion === 'public-research-start.v1'
  const retryOwner = JSON.stringify([configurationReady, active, fixtureStart?.selector, fixtureStart?.bindingDigest, fixtureStart?.fixture,
    fixtureStart?.mode, fixtureStart?.requestKey, authority?.canAcquire, locked])
  const [researchRetryState, setResearchRetryState] = useState({ owner: retryOwner, run: null })
  if (researchRetryState.owner !== retryOwner) setResearchRetryState({ owner: retryOwner, run: null })
  const canRetryResearch = run => Boolean(fixtureStart && (publicStart ? isPublicResearchRun(run) : searchStart ? isProviderFreeSearchRun(run) : isControlledAcquisitionRun(run))
    && (run.status === 'FAILED' || (searchStart || publicStart) && run.status === 'PARTIALLY_SUCCEEDED') && run.canonicalSaved === false
    && isAcquisitionRunId(run.executionAttemptId) && run.actorUserId === fixtureStart.actorUserId
    && run.basisStateVersion === configurationData.basis.stateVersion && run.basisUpdatedAt === configurationData.basis.updatedAt
    && run.researchConfiguration?.configurationVersion === fixtureStart.selector.configurationVersion
    && run.researchConfiguration?.configurationHash === fixtureStart.selector.configurationHash
    && (publicStart ? run.publicResearch?.mode === fixtureStart.mode && (fixtureStart.mode !== 'LIVE' || fixtureStart.requestKey !== run.requestKey)
      : searchStart || run.controlledReplayProvenance?.provenance?.bindingDigest === fixtureStart.bindingDigest)
    && readAcquisitionRun(run, scope) && active && !locked && authority?.canAcquire === true)
  const researchRetry = researchRetryState.owner === retryOwner && canRetryResearch(researchRetryState.run) ? researchRetryState.run : null
  const researchLookup = useGetAcquisitionRunsQuery({ ...scope, sessionRevision, requestKey: researchKey }, { skip: !active || !researchKey })
  const requestPage = !researchLookup.error && !researchLookup.isFetching ? researchLookup.currentData?.data : null
  const requestPageCurrent = researchKey && requestPage?.requestedRequestKey === researchKey && requestPage.scope?.customerId === customerId
    && requestPage.scope?.tenantId === tenantId && (requestPage.scope?.runtimeInstanceKey === runtimeInstanceId || requestPage.scope?.runtimeInstanceId === runtimeInstanceId)
    && requestPage.hasMore === false && Array.isArray(requestPage.items) && requestPage.items.length <= 1
  const requestCandidate = requestPageCurrent && requestPage.items.length ? readAcquisitionRun(requestPage.items[0], scope, researchKey) : null
  const requestRun = (isControlledAcquisitionRun(requestCandidate) || isProviderFreeSearchRun(requestCandidate) || isPublicResearchRun(requestCandidate)) && requestCandidate.researchConfiguration ? requestCandidate : null
  const startResearch = async () => {
    if (!ownsResearchCommand() || !currentActive.current || !configurationReady || latestConfiguration.current !== configurationData
      || reportMode || !fixtureStart || !researchAvailability || researchKeys.length && !researchRetry || authority?.canAcquire !== true || inFlight.current
      || !renderer?.actions?.some(item => String(item.governedAction || item.actionKey).toUpperCase() === 'BUILD_EVIDENCE_PACK' && item.enabled === true)) return
    const requestKey = publicStart && fixtureStart.mode === 'LIVE' ? fixtureStart.requestKey : crypto.randomUUID()
    const body = buildFixtureStartPayload(configurationData, requestKey)
    if (!body) return
    if (researchRetry) { body.predecessorRunId = researchRetry.runId; body.predecessorExecutionAttemptId = researchRetry.executionAttemptId }
    const operationGeneration = generation.current
    setResearchRetryState({owner:retryOwner,run:null})
    inFlight.current = true; setResearchSubmitting(true); setResearchFeedback('Start request submitted. Waiting for a saved Run receipt; this is not recorded progress.')
    researchRoute.current = requestKey
    setParams(previous => { const next = new URLSearchParams(previous); next.set('researchRequestKey', requestKey); next.delete('acquisitionRunId'); next.delete('closedAcquisitionRunId'); return next })
    setInspection('Evidence intake and processing history')
    const currentRequest = () => isCurrent() && currentActive.current && generation.current === operationGeneration && researchRoute.current === requestKey
    const selectReceipt = receipt => {
      if (!(publicStart ? isPublicResearchRun(receipt) && receipt.publicResearch.mode === fixtureStart.mode : searchStart ? isProviderFreeSearchRun(receipt) : isControlledAcquisitionRun(receipt)) || receipt.researchConfiguration?.configurationVersion !== fixtureStart.selector.configurationVersion
        || receipt.researchConfiguration?.configurationHash !== fixtureStart.selector.configurationHash
        || receipt.actorUserId !== fixtureStart.actorUserId || receipt.basisStateVersion !== configurationData.basis.stateVersion
        || receipt.basisUpdatedAt !== configurationData.basis.updatedAt) return false
      const current = latestParams.current
      if (current.get('researchRequestKey') !== requestKey || current.get('acquisitionRunId') && current.get('acquisitionRunId') !== receipt.runId) return false
      const next = new URLSearchParams(current); next.set('acquisitionRunId', receipt.runId); setParams(next)
      setResearchFeedback('The original request has a saved Run. Read or refresh its exact receipt below.')
      return true
    }
    try {
      const response = await execute({ ...scope, sessionRevision, actionKey: 'BUILD_EVIDENCE_PACK', body }).unwrap()
      if (!currentRequest()) return
      if (!selectReceipt(acquisitionRunFromResponse(response, scope, requestKey)))
        setResearchFeedback('The Start outcome is unconfirmed. Refresh the original request; no new request will be submitted automatically.')
    } catch (error) {
      if (currentRequest() && !selectReceipt(acquisitionRunFromError(error, scope, requestKey)))
        setResearchFeedback('The Start outcome could not be verified. Refresh the original request before any further action; do not start another Run.')
    } finally { inFlight.current = false; if (isCurrent()) setResearchSubmitting(false) }
  }
  const researchBrief = !dirty && savedConfiguration ? savedConfiguration.context : draft
  const researchProfile = !dirty && savedConfiguration ? savedConfiguration.coverage : profile
  const saveResearch = async settings => {
    if (!ownsResearchCommand() || !currentActive.current || !configurationReady || latestConfiguration.current !== configurationData
      || reportMode || !configurationData.editable || authority?.canAcquire !== true || inFlight.current || configurationSaving) return
    const operationGeneration = generation.current
    inFlight.current = true; setConfigurationSaving(true); setConfigurationSaveError('')
    try {
      const response = await saveConfiguration({ ...scope, sessionRevision, body: {
        expectedUpdatedAt: configurationData.basis.updatedAt, expectedStateVersion: configurationData.basis.stateVersion,
        expectedConfigurationVersion: savedConfiguration?.configurationVersion || null,
        context: researchContextSnapshot(researchBrief), coverage: researchProfile,
        settings: { ...settings, startingUrls: settings.startingUrls.split(/\r?\n/).map(value => value.trim()).filter(Boolean) },
      } }).unwrap()
      if (!isCurrent() || !currentActive.current || generation.current !== operationGeneration) return
      const saved = readSavedResearchConfiguration(response, scope, renderer?.runtimeInstance?.stateVersion)
      if (!saved?.configuration) throw new Error('Save response could not be verified. Reload before saving again.')
      const readback = await configurationRead.refetch().unwrap()
      if (!isCurrent() || !currentActive.current || generation.current !== operationGeneration) return
      const verified = readSavedResearchConfiguration(readback, scope, renderer?.runtimeInstance?.stateVersion)
      if (verified?.configuration?.configurationVersion !== saved.configuration.configurationVersion) {
        throw new Error('Settings may have saved, but read-back could not be verified. Reload before saving again.')
      }
    } catch (error) {
      if (isCurrent() && currentActive.current && generation.current === operationGeneration) {
        setConfigurationSaveError(error?.data?.error?.message || error.message || 'Settings could not be saved. Reload before saving again.')
      }
    } finally { inFlight.current = false; if (isCurrent()) setConfigurationSaving(false) }
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; inspectionTrigger.current = null; preparation.current += 1 } }, [contextKey])
  useEffect(() => {
    if (!active) {
      generation.current += 1; preparation.current += 1; setPreparing(false); setInspection(null); inspectionTrigger.current = null; setEditor(null); restoreEditorFocus.current = false
      if (preparingRef.current) {
        preparingRef.current = false; setFileError('Document preparation was cancelled when leaving Context. Clear the selection and choose files again.'); if (fileInput.current) fileInput.current.value = ''
      }
    }
  }, [active])
  const stamp = renderer?.runtimeInstance?.updatedAt
  const briefAvailable = Boolean(discovery?.inputValues && typeof discovery.inputValues === 'object' && !Array.isArray(discovery.inputValues))
  const savedDraft = draftFrom(discovery)
  const briefChanged = JSON.stringify(buildDiscoveryInputsPayload(draft)) !== JSON.stringify(buildDiscoveryInputsPayload(savedDraft))
  const reportDeclaration = reportMode ? readCustomerResearchDeclaration(reportFields) : null
  const urlReport = reportMode && reportDelivery === 'url'
  const reportUrlRead = urlReport ? readCustomerReportUrl(reportUrl) : null
  const reportProblem = reportMode ? !runtimeInstanceId || !customerId || !tenantId ? 'The selected report upload scope is unavailable. Refresh before continuing.'
    : profile !== 'STANDARD' ? 'Customer-supplied reports currently require Standard processing.'
    : briefChanged || editor ? 'Discard or finish staged brief edits before uploading a report. The upload preserves the saved brief.'
      : urlReport && reportUrlRead.error ? reportUrlRead.error
        : !urlReport && documents.length !== 1 ? 'Select one supported customer-supplied report. Selection does not upload it.'
        : reportDeclaration.error : ''
  useEffect(() => {
    if (!dirty && briefAvailable && !busy) {
      setDraft(draftFrom(discovery)); setProfile(discovery?.acquisitionProfile || 'STANDARD'); setBasis(stamp)
    }
  }, [stamp, briefAvailable, dirty, busy, discovery])
  const stale = basis !== stamp
  const action = selectAcquisitionAction(renderer, discovery)
  const editable = Boolean(briefAvailable && authority?.canAcquire === true && !locked && !loading && active)
  const readiness = buildDiscoveryContextReadiness(draft, { acquisitionProfile: profile, documentCount: urlReport ? 1 : documents.length })
  const documentAttempt = discovery?.acquisition?.documentAcquisition?.latestAttempt
  const websiteAttempt = discovery?.acquisition?.websiteAcquisition
  const websiteCounts = websiteAttempt
    && [websiteAttempt.sourceCount, websiteAttempt.acquiredSourceCount, websiteAttempt.failedSourceCount]
      .every(count => Number.isSafeInteger(count) && count >= 0 && count <= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT)
    && websiteAttempt.sourceCount > 0
    && websiteAttempt.sourceCount === websiteAttempt.acquiredSourceCount + websiteAttempt.failedSourceCount
    && (websiteAttempt.status === 'ACQUIRED' && websiteAttempt.acquiredSourceCount > 0 && websiteAttempt.failedSourceCount === 0
      || websiteAttempt.status === 'PARTIAL' && websiteAttempt.acquiredSourceCount > 0 && websiteAttempt.failedSourceCount > 0
      || websiteAttempt.status === 'FAILED' && websiteAttempt.acquiredSourceCount === 0 && websiteAttempt.failedSourceCount > 0)
  const documentOutcomes = documentAttempt?.contractVersion === 'document-extraction-outcomes.v1'
    && Array.isArray(documentAttempt.items) && documentAttempt.items.length <= DISCOVERY_DOCUMENT_MAX_COUNT
    && new Set(documentAttempt.items.map(item => item?.inputIndex)).size === documentAttempt.items.length
    && documentAttempt.items.every(item => Number.isInteger(item?.inputIndex) && item.inputIndex >= 0
      && item.inputIndex < DISCOVERY_DOCUMENT_MAX_COUNT && ['SUCCEEDED', 'FAILED'].includes(item.status)
      && (item.status !== 'SUCCEEDED' || Number.isSafeInteger(item.evidenceObjectCount) && item.evidenceObjectCount >= 0))
    ? documentAttempt.items : null
  const websiteItems = websiteAttempt?.latestAttempt
  const websiteOutcomes = websiteCounts && websiteItems?.contractVersion === 'website-acquisition-outcomes.v1'
    && Array.isArray(websiteItems.items) && websiteItems.items.length === websiteAttempt.sourceCount
    && websiteItems.items.every((item, index) => item?.inputIndex === index && ['SUCCEEDED', 'FAILED'].includes(item.status)
      && typeof item.sourceId === 'string' && item.sourceId.length > 0 && item.sourceId.length <= 160
      && Number.isSafeInteger(item.evidenceObjectCount) && item.evidenceObjectCount >= 0
      && typeof item.retainedPrior === 'boolean'
      && (item.status !== 'FAILED' || item.evidenceObjectCount === 0 && item.reason === 'WEBSITE_ACQUISITION_FAILED')
      && (!item.retainedPrior || item.status === 'FAILED' && Number.isSafeInteger(item.retainedEvidenceObjectCount) && item.retainedEvidenceObjectCount >= 0))
    && websiteItems.items.filter(item => item.status === 'SUCCEEDED').length === websiteAttempt.acquiredSourceCount
    && new Set(websiteItems.items.map(item => item.sourceId)).size === websiteItems.items.length
    ? websiteItems.items : null
  const reason = locked ? 'This revision is locked. Inspect its sources or use the normal revision workflow for new acquisition.'
    : !briefAvailable ? 'Brief details unavailable for this revision. Refresh or inspect the existing workspace.'
      : !editable ? 'Acquisition authority or current scoped data is unavailable. Refresh before editing.'
        : busy ? 'Acquisition is in progress.' : preparing ? 'Preparing selected documents…'
          : stale ? 'The revision changed. Discard local changes and load the current brief before acquiring.'
            : blocked ? 'Refresh and inspect the current sources before retrying acquisition.'
              : websiteAddress.trim() ? 'Stage or clear the website address before acquiring.'
                : fileError || (reportMode ? reportProblem : action && action.enabled !== true ? action.disabledReason || 'The delivered acquisition action is unavailable.' : readiness.reason)
  const controlsDisabled = !editable || busy || preparing || stale || blocked || researchSubmitting
  const promptSettings = configurationReady && configurationData.currency === 'CURRENT_BASIS' && savedConfiguration
    && Object.entries(researchContextSnapshot(savedDraft)).every(([key, value]) => savedConfiguration.context[key] === value)
    ? { sourceLabels: savedConfiguration.settings.sources.map(key => PUBLIC_RESEARCH_SOURCES.find(source => source.key === key).label),
      startingUrls: savedConfiguration.settings.startingUrls, instructions: savedConfiguration.settings.instructions } : null
  const canCopyPrompt = !controlsDisabled && Boolean(savedDraft.companyName?.trim())
  const change = (key, value) => { setDirty(true); setDraft(previous => ({ ...previous, [key]: value })) }
  const clearFiles = () => { preparation.current += 1; setDocuments([]); setReportFields(emptyCustomerResearchFields()); setReportUrl(''); setReportDelivery('file'); setFileError(''); if (fileInput.current) fileInput.current.value = '' }
  const changeReport = (key, value) => { setDirty(true); setReportFields(previous => ({ ...previous, [key]: value })) }
  const changeDocumentMode = event => {
    if (controlsDisabled || inFlight.current || editor || websiteAddress.trim()) return
    clearFiles(); setReportMode(event.target.value === 'research')
  }
  const chooseFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length || !ownsResearchCommand() || !currentActive.current || controlsDisabled || inFlight.current || preparingRef.current || urlReport) return
    const operation = ++preparation.current
    preparingRef.current = true; setPreparing(true); setFileError('')
    try {
      if (reportMode) {
        setReportFields(previous => ({ ...previous, rightsConfirmed: false }))
        const problem = documents.length ? 'Clear the selected report before choosing another.' : customerResearchFileProblem(files)
        if (problem) throw new Error(problem)
      }
      const prepared = [...documents]
      for (const file of files) {
        const document = await buildDiscoveryDocumentSource(file)
        if (!isCurrent() || preparation.current !== operation || !currentActive.current) return
        const duplicate = prepared.some(existing => existing.fileName === document.fileName
          && existing.mimeType === document.mimeType && existing.sizeBytes === document.sizeBytes
          && existing.contentBase64 === document.contentBase64)
        if (!duplicate) prepared.push(document)
        if (prepared.length > DISCOVERY_DOCUMENT_MAX_COUNT) throw new Error(`Select up to ${DISCOVERY_DOCUMENT_MAX_COUNT} documents per acquisition.`)
      }
      if (isCurrent() && preparation.current === operation) { setDocuments(prepared); setDirty(true) }
    } catch (error) {
      if (isCurrent() && preparation.current === operation) setFileError(error.message)
    } finally {
      if (isCurrent() && preparation.current === operation) { preparingRef.current = false; setPreparing(false); if (fileInput.current) fileInput.current.value = '' }
    }
  }
  const removeDocument = (index) => {
    if (!isCurrent() || controlsDisabled || preparingRef.current || inFlight.current) return
    setDocuments(previous => previous.filter((_, itemIndex) => itemIndex !== index))
    if (reportMode) setReportFields(emptyCustomerResearchFields())
    setFileError('')
    fileInput.current?.focus()
  }
  const refreshCurrent = async () => {
    if (!isCurrent() || inFlight.current || preparing) return
    const operationGeneration = generation.current
    setBusy(true)
    try {
      const refreshed = await refresh()
      if (!isCurrent()) return
      if (generation.current !== operationGeneration || !currentActive.current) {
        setBlocked(true); setFeedback({ message: 'Context changed while refreshing. Refresh current acquisition data again before continuing.' }); return
      }
      if (refreshed) { if (isCurrent()) { setBlocked(Boolean(request.current)); setFeedback({ message: request.current ? 'Current data refreshed. Check the original acquisition request before starting another operation.' : 'Current acquisition data refreshed. Inspect Sources before retrying a previous request.' }) } }
      else if (isCurrent()) setFeedback({ error: true, message: 'Current acquisition data could not be verified. Try Refresh again.' })
    } finally { if (isCurrent()) setBusy(false) }
  }
  const submitRequest = async (operation) => {
    if (!isCurrent() || !operation || inFlight.current) return
    const operationGeneration = generation.current
    inFlight.current = true; setBusy(true); setBlocked(true)
    setFeedback({ message: 'Acquiring evidence through the existing governed service…' })
    status.current?.focus()
    try {
      const response = operation.actionKey
        ? await execute({ ...scope, actionKey: operation.actionKey, body: operation.body }).unwrap()
        : await updateInputs({ runtimeInstanceId, ...(operation.body.customerSuppliedResearch ? { customerId, tenantId, sessionRevision } : {}), body: operation.body }).unwrap()
      const receipt = acquisitionRunFromResponse(response, scope, operation.body.requestKey)
      if (!receipt || !['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'].includes(receipt.status)) {
        if (isCurrent()) setFeedback({ error: true, message: 'Acquisition response has no verified scoped terminal receipt. Check the original request or inspect Run history before continuing.' })
        return
      }
      request.current = null
      if (isCurrent()) { setPendingRequest(false); setRetryFrom(['FAILED', 'PARTIALLY_SUCCEEDED'].includes(receipt.status) ? receipt.runId : null) }
      if (!isCurrent()) return
      if (generation.current !== operationGeneration || !currentActive.current) {
        setFeedback({ message: 'Acquisition request completed after leaving Context. Refresh and inspect current sources before continuing.' }); return
      }
      if (receipt.canonicalSaved) { clearFiles(); setDirty(false) }
      const refreshed = await refresh()
      if (isCurrent()) {
        if (generation.current !== operationGeneration || !currentActive.current) {
          setFeedback({ message: 'Acquisition completed while Context changed. Refresh and inspect current sources before continuing.' }); return
        }
        setBlocked(!refreshed)
        setFeedback({ error: !refreshed || receipt.status === 'FAILED', message: `${acquisitionRunLabel(receipt)}. ${receipt.canonicalSaved ? refreshed ? 'Acquisition recorded. Inspect Sources and review the resulting evidence. No evidence was accepted by this action.' : 'Acquisition recorded, but current reads could not be verified. Refresh before continuing.' : 'This operation did not save the revision. Inspect its Run before preparing an explicit retry.'}` })
      }
    } catch (error) {
      const receipt = acquisitionRunFromError(error, scope, operation.body.requestKey)
      if (receipt && ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'].includes(receipt.status)) {
        request.current = null
        if (isCurrent()) { setPendingRequest(false); setRetryFrom(['FAILED', 'PARTIALLY_SUCCEEDED'].includes(receipt.status) ? receipt.runId : null) }
      }
      if (isCurrent()) setFeedback({ error: true, message: `${formatIntelligenceHubEvidenceError(error)} ${receipt ? `${acquisitionRunLabel(receipt)}.` : 'Execution outcome is unconfirmed. Check the original request before starting another operation.'} Refresh and inspect Sources before retrying; selected documents remain staged locally.` })
    } finally { inFlight.current = false; if (isCurrent()) setBusy(false) }
  }
  const acquire = async event => {
    event.preventDefault()
    if (!ownsResearchCommand() || reason || inFlight.current || request.current || !['STANDARD', 'ENHANCED'].includes(profile)) return
    const operation = { actionKey: !reportMode && action ? String(action.governedAction || action.actionKey).trim().toUpperCase() : null,
      body: { inputs: buildDiscoveryInputsPayload(reportMode ? savedDraft : draft), acquisitionProfile: profile, expectedUpdatedAt: authority.runtimeUpdatedAt,
        requestKey: crypto.randomUUID(), ...(retryFrom ? { predecessorRunId: retryFrom } : {}),
        ...(reportMode ? { customerSuppliedResearch: reportDeclaration.declaration } : {}),
        ...(urlReport ? { customerReportUrl: reportUrlRead.url } : {}),
        ...(documents.length ? { documentSources: documents } : {}) } }
    request.current = operation; setPendingRequest(true)
    await submitRequest(operation)
  }
  const startEditing = () => { restoreEditorFocus.current = true; setEditor({ companyName: draft.companyName, marketRegion: draft.marketRegion, targetOffer: draft.targetOffer, notes: draft.notes, profile, dirty, websiteSources: [...draft.websiteSources] }) }
  const cancelEditing = () => {
    if (!editor) return
    const { profile: previousProfile, dirty: previousDirty, websiteSources: previousWebsites, ...fields } = editor
    setDraft(previous => ({ ...previous, ...fields })); setProfile(previousProfile)
    setDirty(previousDirty || documents.length > 0 || JSON.stringify(previousWebsites) !== JSON.stringify(draft.websiteSources)); setEditor(null)
  }
  const validWebsite = (() => { try { const url = new URL(websiteAddress.trim()); return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) } catch { return false } })()
  const stageWebsite = () => {
    if (controlsDisabled || reportMode || !validWebsite || draft.websiteSources.filter(Boolean).length >= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT) return
    change('websiteSources', [...draft.websiteSources.filter(Boolean), websiteAddress.trim()]); setWebsiteAddress('')
  }
  if (locked && !pendingRequest) return <div className="intelligence-hub__locked-context">
    <PostLockSubmissionPanel scope={{ runtimeInstanceId, customerId, tenantId }} renderer={renderer}
      contextKey={contextKey} route={availabilityRoute} canRead={availabilityReadAllowed} loading={availabilityLoading}
      error={availabilityError} active={active} locked />
    <Card variant="outlined"><Card.Header><h3>Context acquisition</h3></Card.Header><Card.Body>
      <Fieldset disabled><Fieldset.Legend>Acquisition for the locked revision</Fieldset.Legend><Fieldset.Content>
        <Input id={`${researchDescriptionId}-locked-website`} label="Website address" size="sm" value="" placeholder="Acquisition unavailable while locked" readOnly />
        <Button variant="outline" size="sm" disabled>Select evidence files</Button>
        <Button size="sm" disabled>Acquire new evidence</Button>
      </Fieldset.Content></Fieldset>
      <ButtonGroup stackOnMobile><Button size="sm" variant="outline" onClick={event => openInspection('Why evidence remains separate', event.currentTarget)}>Why separate?</Button>
        <Button size="sm" variant="outline" onClick={event => openInspection('Evidence intake and processing history', event.currentTarget)}>Runs and processing history</Button></ButtonGroup>
      <p>This revision is locked. New evidence stays outside its frozen basis until review and explicit successor admission.</p>
    </Card.Body></Card>
    {inspection && active && inspection !== 'Customer-supplied research prompt' ? <Dialog open onClose={closeInspection} size="lg" aria-label={inspection}>
      <Dialog.Header><h2>{inspection}</h2></Dialog.Header><Dialog.Body>
        {inspection === 'Evidence intake and processing history' ? <>
          <p>Inspect recorded acquisition Runs for this locked revision. Inspection does not acquire evidence or prepare a retry.</p>
          <AcquisitionRunHistory scope={scope} active={active && isCurrent()} locked canAcquire={false} busy={busy || preparing} />
        </> : <>
        <p>Later evidence is submitted outside locked membership. A human impact conclusion and explicit successor admission remain separate. Neither action changes the locked understanding.</p>
        <p>Submission availability comes from the server. A blocked or failed check does not mean there is no evidence.</p>
        </>}
      </Dialog.Body><Dialog.Footer><Button variant="outline" size="sm" onClick={closeInspection}>Back to Context</Button></Dialog.Footer>
    </Dialog> : null}
  </div>
  return <><form className="intelligence-hub__context-workspace intelligence-hub__acquisition" onSubmit={acquire}>
    <div className="intelligence-hub__context-boundary"><FiLock size={16} aria-hidden="true" /><span>{locked ? 'This revision is locked. Acquisition cannot change its frozen evidence. Separate post-lock availability is shown below.' : 'Gather evidence for this revision. Accepted understanding remains separate.'}</span><Button size="sm" variant="outline" onClick={event => openInspection('Publication and lock record', event.currentTarget)}>Why separate?<FiArrowUpRight size={14} aria-hidden="true" /></Button></div>
    <section className="intelligence-hub__context-brief">
      <header ref={briefHeader}><h2>Evidence gathering brief</h2>{!editor ? <Button size="sm" variant="outline" aria-label="Edit evidence gathering brief" disabled={!briefAvailable || controlsDisabled || reportMode} onClick={startEditing}>Edit</Button> : null}</header>
      {briefAvailable ? <>{!editor ? <dl className="intelligence-hub__context-brief-values">
        {[['companyName', 'Company name'], ['marketRegion', 'Market / region'], ['targetOffer', 'Product or service']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{draft[key]?.trim() || 'Missing'}</dd></div>)}
        <div><dt>Evidence gathering level</dt><dd>{profile === 'STANDARD' ? 'Standard' : profile === 'ENHANCED' ? 'Enhanced' : 'Unavailable'}</dd></div>
      </dl> : <div className="intelligence-hub__brief-editor">
        {[['companyName', 'Company name', 255], ['marketRegion', 'Market / region', 255], ['targetOffer', 'Product or service', 500]].map(([key,label,limit]) => <div key={key} className="intelligence-hub__brief-field"><label htmlFor={`context-${key}`}>{label}</label><Input id={`context-${key}`} size="sm" fullWidth maxLength={limit} value={draft[key] || ''} disabled={controlsDisabled} onChange={event => change(key,event.target.value)} /></div>)}
        <Select size="sm" label="Evidence gathering level" options={DISCOVERY_ACQUISITION_PROFILE_OPTIONS.map(option => ({...option,label:option.value === 'STANDARD' ? 'Standard' : option.value === 'ENHANCED' ? 'Enhanced' : 'Strategic · Coming soon'}))} value={profile} disabled={controlsDisabled} onChange={event => {setDirty(true);setProfile(event.target.value)}} />
        <div className="intelligence-hub__brief-notes"><label htmlFor="context-notes">Additional notes or instructions (optional)</label><Textarea id="context-notes" rows={3} size="sm" fullWidth maxLength={4000} value={draft.notes || ''} disabled={controlsDisabled} onChange={event => change('notes', event.target.value)} /></div>
        <p>{DISCOVERY_ACQUISITION_PROFILE_GUIDANCE[profile]?.summary} Apply stages this brief locally; it is saved when acquisition is submitted.</p>
        <div className="intelligence-hub__context-controls"><Button size="sm" variant="outline" disabled={controlsDisabled} onClick={() => setEditor(null)}>Apply brief</Button><Button size="sm" variant="outline" disabled={busy || preparing} onClick={cancelEditing}>Cancel</Button></div>
      </div>}{dirty ? <p>{reportMode && !briefChanged ? 'Report details are staged locally. No report has been uploaded.' : 'Brief edits are staged locally. Acquisition has not been submitted.'}</p> : null}</> : <p>Brief details unavailable for this revision.</p>}
      <div className="intelligence-hub__context-controls"><Button size="sm" variant="outline" disabled={!canCopyPrompt} onClick={event => openInspection('Customer-supplied research prompt', event.currentTarget)}>Preview research prompt</Button><small>Uses the saved brief. Review before copying to your chosen tool.</small></div>
    </section>
    {researchRetry ? <p role="status">Explicit {publicStart ? 'research' : 'fixture'} retry prepared for Run {researchRetry.runId}, Attempt {researchRetry.executionAttemptId}. Start creates a new Run and Attempt; preparing does not submit.</p> : null}
    <PublicResearchConfiguration key={JSON.stringify([contextKey, sessionRevision, basis, profile, draft, active, controlsDisabled])}
      brief={researchBrief} profile={researchProfile} canPrepare={active && !controlsDisabled && !reportMode && ['STANDARD', 'ENHANCED'].includes(researchProfile) && Boolean(researchBrief.companyName?.trim())}
      savedConfiguration={savedConfiguration} currency={configurationData?.currency} availability={researchAvailability} onSave={saveResearch}
      saveAvailable={configurationReady && configurationData.editable && !controlsDisabled && !reportMode}
      saving={configurationSaving} saveError={configurationSaveError} onStart={startResearch} starting={researchSubmitting}
      startAvailable={Boolean(fixtureStart && (!researchKeys.length || researchRetry) && !controlsDisabled && !reportMode && renderer?.actions?.some(item => String(item.governedAction || item.actionKey).toUpperCase() === 'BUILD_EVIDENCE_PACK' && item.enabled === true))}
      readLoading={configurationRead.isFetching} readUnavailable={!configurationReady && !configurationRead.isFetching}
      onInspectAvailability={event => openInspection('Research availability', event.currentTarget)} />
    <div className="intelligence-hub__context-intake">
      <section><h2>Websites</h2>
        <div className="intelligence-hub__website-stage"><Input type="url" aria-label="Website address" placeholder="https://example.com" size="sm" fullWidth maxLength={500} value={websiteAddress} disabled={controlsDisabled || reportMode} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); stageWebsite() } }} onChange={event => setWebsiteAddress(event.target.value)} /><Button size="sm" variant="outline" aria-label="Stage website" disabled={controlsDisabled || reportMode || !validWebsite || draft.websiteSources.filter(Boolean).length >= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT} onClick={stageWebsite}><FiPlus size={16} aria-hidden="true" /></Button></div>
        <p>{dirty && draft.websiteSources.some(Boolean) ? `${draft.websiteSources.filter(Boolean).length} website addresses in the local brief.` : 'No websites staged.'}</p>
        <details className="intelligence-hub__context-disclosure"><summary>Connected websites</summary><p>Historical sources remain in Sources; editing the brief does not remove previously acquired evidence.</p>
        {briefAvailable ? <div className="intelligence-hub__acquisition-fields">{draft.websiteSources.map((url,index) => <div key={index} className="intelligence-hub__acquisition-url"><Input label={`Website URL ${index+1}`} size="sm" id={`context-url-${index}`} fullWidth maxLength={500} value={url} disabled={controlsDisabled || reportMode} onChange={event => change('websiteSources',draft.websiteSources.map((value,i)=>i===index?event.target.value:value))} /><Button size="sm" variant="outline" disabled={controlsDisabled || reportMode} aria-label={`Remove website URL ${index+1}`} onClick={() => change('websiteSources',draft.websiteSources.length===1?['']:draft.websiteSources.filter((_,i)=>i!==index))}>Remove</Button></div>)}<Button size="sm" variant="outline" disabled={controlsDisabled || reportMode || draft.websiteSources.length>=DISCOVERY_WEBSITE_SOURCE_MAX_COUNT} onClick={() => change('websiteSources',[...draft.websiteSources,''])}>Add URL</Button></div> : <p>Website detail unavailable.</p>}
        <Button size="sm" variant="outline" onClick={()=>onSelectView('Sources')}>Inspect connected sources</Button>
        {websiteCounts ? <section aria-label="Latest website acquisition outcomes"><h3>Latest website acquisition</h3><p>{websiteAttempt.acquiredSourceCount} succeeded · {websiteAttempt.failedSourceCount} failed across {websiteAttempt.sourceCount} submitted websites.</p>{websiteOutcomes ? <ul>{websiteOutcomes.map(item=><li key={item.inputIndex}>Website {item.inputIndex+1}: {item.status==='SUCCEEDED'?`Succeeded · ${item.evidenceObjectCount} eligible evidence objects`:`Failed · ${item.retainedPrior?`Prior source retained with ${item.retainedEvidenceObjectCount} previous evidence objects.`:'Inspect the URL and retry.'}`}</li>)}</ul>:websiteItems?<p>Individual website outcomes unavailable.</p>:null}<p>These are the latest attempt’s outcomes. Inspect Sources for exact provenance; acquisition does not establish evidence sufficiency.</p></section>:websiteAttempt?<p>Latest website acquisition outcomes unavailable.</p>:null}</details>
      </section>
      <section><h2>{reportMode ? 'Customer-supplied research' : 'Document batch'}</h2>
        <Select size="sm" label="Document handling" value={reportMode ? 'research' : 'extract'} disabled={controlsDisabled || Boolean(editor) || Boolean(websiteAddress.trim())} onChange={changeDocumentMode}
          helperText={websiteAddress.trim() ? 'Clear or stage the website entry before changing document handling.' : undefined}
          options={[{ value: 'extract', label: 'Evidence extraction' }, { value: 'research', label: 'Customer-supplied research' }]} />
        {reportMode ? <Select size="sm" label="Report delivery" value={reportDelivery} disabled={controlsDisabled} options={[
          { value: 'file', label: 'Upload report file' }, { value: 'url', label: 'Direct public report URL' },
        ]} onChange={event => { if (!ownsResearchCommand() || controlsDisabled) return; clearFiles(); setReportDelivery(event.target.value); setDirty(true) }} /> : null}
        {urlReport ? <>
          <Input id="context-report-url" label="Public report file URL" type="url" size="sm" fullWidth maxLength={500} value={reportUrl} disabled={controlsDisabled}
            onChange={event => { if (!ownsResearchCommand() || controlsDisabled) return; preparation.current++; setReportUrl(event.target.value); setReportFields(previous => ({ ...previous, rightsConfirmed: false })); setDirty(true) }} />
          <p>One direct public HTTPS TXT, DOCX, PDF or PPTX report. Retrieval requires a recorded Product/Governance source-access basis. Login, redirects, query parameters and HTML share pages are unavailable; export and upload the file instead.</p>
        </> : <>
        <p>{documents.length} of {reportMode ? 1 : DISCOVERY_DOCUMENT_MAX_COUNT} files staged</p>
        <input ref={fileInput} id="context-documents" className="sr-only" type="file" aria-label={reportMode ? 'Select one research report (TXT, DOCX, PDF or PPTX)' : 'Select documents (up to 5; 2.5 MB each, PPTX up to 40 MB)'} multiple={!reportMode} accept={reportMode ? CUSTOMER_RESEARCH_ACCEPT : DISCOVERY_DOCUMENT_ACCEPT} disabled={controlsDisabled} onChange={chooseFiles} />
        <Button size="sm" variant="outline" className="intelligence-hub__select-files" aria-label={reportMode ? 'Select research report' : 'Select evidence files'} disabled={controlsDisabled || reportMode && documents.length > 0} onClick={()=>fileInput.current?.click()}><FiPlus size={14} aria-hidden="true" />{reportMode ? 'Select report' : 'Select files'}</Button>
        {documents.length ? <ul className="intelligence-hub__staged-documents" aria-label="Selected acquisition documents">{documents.map((document,index)=><li key={index}><span>{document.fileName} · {formatDocumentSize(document.sizeBytes)} · Staged locally</span><Button size="sm" variant="outline" disabled={controlsDisabled} aria-label={`Remove staged document ${index+1}: ${document.fileName}`} onClick={()=>removeDocument(index)}>Remove</Button></li>)}</ul>:null}
        {fileError ? <p role="alert">{fileError}</p>:null}
        {documents.length || fileError ? <Button size="sm" variant="outline" disabled={busy || preparing} onClick={clearFiles}>Clear selected files</Button>:null}
        </>}
        {reportMode ? <div className="intelligence-hub__acquisition-fields">
          <p>{urlReport ? 'Supply only the report URL you are authorised to provide. StorylineOS retrieves that single permitted file; it does not follow citation links.' : 'Upload research you obtained separately. This upload does not fetch websites or citation links.'} Your saved brief and existing evidence are preserved. New evidence awaits human review.</p>
          <p>Successful AM02 report intake retains the exact original and hash under the approved 30-day Development/Test policy. Preparing a file or URL is local and does not confirm storage. Production retention remains separate.</p>
          <Input id="context-report-rights" label="Permission or ownership reference" size="sm" fullWidth required maxLength={1000} value={reportFields.rightsReference} disabled={controlsDisabled} onChange={event => changeReport('rightsReference', event.target.value)} />
          <Tickbox size="sm" label="I have the right to supply this report and permit its 30-day Development/Test retention" checked={reportFields.rightsConfirmed} disabled={controlsDisabled} onChange={event => changeReport('rightsConfirmed', event.target.checked)} />
          <p>This is your declaration, not independent permission or evidence verification. Leave it unconfirmed when the basis is unknown.</p>
          {[['tool', 'Declared tool (optional)', 120], ['model', 'Declared model/version (optional)', 120], ['searchMethod', 'Declared research method (optional)', 1000]].map(([key, label, limit]) =>
            <Input key={key} id={`context-report-${key}`} label={label} size="sm" fullWidth maxLength={limit} value={reportFields[key]} disabled={controlsDisabled} onChange={event => changeReport(key, event.target.value)} />)}
          <Textarea label="Declared citation URLs (optional, one per line)" size="sm" fullWidth rows={3} maxLength={10020} value={reportFields.citationUrls} disabled={controlsDisabled} onChange={event => changeReport('citationUrls', event.target.value)} />
          <p>Blank tool/model/method details remain unknown. Declared links are not fetched or claimed to be a complete citation list; the original report retains its content.</p>
        </div> : null}
        <details className="intelligence-hub__context-disclosure"><summary>File limits</summary><p>{reportMode ? 'One TXT, DOCX, PDF or PPTX report. 2.5 MB, or up to 40 MB for PPTX. Clear the selection before choosing another report; permission confirmation resets for a new file.' : DOCUMENT_EXTRACTION_HELPER_TEXT}</p>{!reportMode ? <><p>Up to 5 files; 2.5 MB each, PPTX up to 40 MB. Further selections add to this batch; identical files are included once.</p><p>{DOCUMENT_EXTRACTION_STORAGE_NOTE}</p></> : null}
        {documentOutcomes?<section aria-label="Latest document extraction outcomes"><h3>Latest document extraction</h3><p>Each result refers to an input in the latest attempt. Successful extraction does not establish evidence sufficiency.</p><ul>{documentOutcomes.map(item=><li key={item.inputIndex}>Input {item.inputIndex+1}: {item.status==='SUCCEEDED'?`Succeeded · ${item.evidenceObjectCount} eligible evidence objects`:'Failed · Choose a supported readable file and retry.'}</li>)}</ul></section>:documentAttempt?<p>Latest document extraction outcomes unavailable.</p>:null}</details>
      </section>
      <section><h2>Evidence continuity</h2><strong className="intelligence-hub__continuity-number">{countsLoading?'Loading…':evidenceStatusCounts?.accepted??'Unavailable'}</strong><p>Accepted evidence retained in the selected revision.</p><p>New evidence and interpretation stay separate from published understanding.</p>
        <Button size="sm" variant="outline" onClick={event=>openInspection('Evidence intake and processing history',event.currentTarget)}>Runs and processing history<FiArrowUpRight size={14} aria-hidden="true" /></Button>
      </section>
    </div>
    <div className="intelligence-hub__context-submit"><div ref={status} tabIndex={-1} role="status" className="intelligence-hub__decision-feedback">{feedback?.message || reason || (reportMode ? 'Ready to submit the declared report. Evidence remains pending human review.' : 'Ready to acquire. Resulting evidence still requires human review.')}</div><Button size="sm" type="submit" disabled={Boolean(reason)||!['STANDARD','ENHANCED'].includes(profile)}>{busy?'Acquiring…':urlReport ? 'Retrieve research report' : reportMode ? 'Upload research report' : 'Acquire new evidence'}<FiArrowRight size={14} aria-hidden="true" /></Button></div>
    {feedback?.error && reason ? <p>{reason}</p>:null}
    {(pendingRequest||blocked||stale||retryFrom||dirty||documents.length>0) ? <div className="intelligence-hub__context-controls">
      <Button size="sm" variant="outline" disabled={busy||preparing} onClick={refreshCurrent}>Refresh acquisition data</Button>
      {pendingRequest?<Button size="sm" variant="outline" disabled={busy||preparing||!active} onClick={()=>submitRequest(request.current)}>Check original acquisition request</Button>:null}
      {retryFrom?<p>Next acquisition explicitly retries Run {retryFrom} with a new request identity.</p>:null}
      <Button size="sm" variant="outline" disabled={busy||preparing||!dirty&&!documents.length} onClick={()=>{setDraft(draftFrom(discovery));setProfile(discovery?.acquisitionProfile||'STANDARD');setBasis(stamp);setDirty(false);clearFiles();setReportMode(false)}}>Discard local changes</Button>
    </div>:null}
    <footer className="intelligence-hub__context-footer"><Button size="sm" variant="outline" onClick={()=>onSelectView('Overview')}><FiArrowLeft size={14} aria-hidden="true" />Overview</Button><small>Navigation does not approve evidence or change the revision.</small><Button size="sm" variant="outline" onClick={()=>onSelectView('Sources')}>Sources<FiArrowRight size={14} aria-hidden="true" /></Button></footer>
    {inspection && active && inspection !== 'Customer-supplied research prompt' ? <Dialog open onClose={closeInspection} size="lg" className="intelligence-hub__inspection-dialog" aria-label={inspection||'Context inspection'}><Dialog.Header><h2>{inspection}</h2></Dialog.Header><Dialog.Body>
      {!['Research availability', 'Customer-supplied research prompt'].includes(inspection) ? <Select size="sm" label="Record" className="intelligence-hub__inspection-record" value={inspection||''} options={[{value:inspection||'',label:inspection||''}]} onChange={()=>{}} /> : null}
      {inspection==='Research availability'?<><p>{researchAvailability && Object.hasOwn(researchAvailability, 'researchStart') ? publicStart ? fixtureStart.mode === 'LIVE' ? 'The current server-issued release controls this Public Research operation.' : 'Only the registered offline Public Research fixture is available. Live research remains unavailable.' : 'Public Research remains blocked under the current server capability.' : researchAvailability ? RESEARCH_AVAILABILITY_MESSAGES[researchAvailability.reason] : configurationRead.isFetching ? 'Checking research availability…' : 'Research availability is unavailable for these settings. Reload or save the current settings before checking again.'}</p><p>{publicStart && fixtureStart.mode === 'LIVE' ? 'Live research is limited to the current server-issued single-run release.' : 'Research settings can be saved separately when this revision is editable. Live research cannot start.'}</p><p>Live research requires approved provider and registry access, licensing, retention, regional and operating limits, budget and spend ownership.</p><p>{publicStart ? fixtureStart.mode === 'LIVE' ? 'A server-issued research release is available for this saved configuration. Start remains explicit and subject to the current action permission.' : 'A verified offline Public Research fixture is available for this saved configuration. Start remains explicit and subject to the current action permission.' : fixtureStart ? 'A verified provider-free fixture is available for this saved configuration. Start remains explicit and subject to the current action permission.' : researchAvailability && Object.hasOwn(researchAvailability, 'researchStart') ? 'Public Research cannot start from this workspace under the current server hold.' : 'Controlled replay also remains disabled. No controlled replay can be started from this workspace.'}</p><p>Continue using the existing website and document intake where authorised. Acquisition places candidates in Sources and Review; it does not accept evidence, recompute understanding or change a locked revision.</p></>:inspection==='Publication and lock record'?<><dl className="intelligence-hub__inspection-facts"><div><dt>Selected revision</dt><dd>{renderer?.runtimeInstance?.name||'Selected workspace'} · {renderer?.revision?.revisionNumber?`R${renderer.revision.revisionNumber}`:'Revision unavailable'}</dd></div><div><dt>Lock state</dt><dd>{locked?'Locked':'Not locked'}</dd></div><div><dt>Frozen evidence membership and versions</dt><dd>Not supplied</dd></div><div><dt>Snapshot integrity</dt><dd>Not independently verified</dd></div></dl><p>Only an explicit authorised successor can change a locked revision. Acquisition and evidence acceptance remain separate.</p></>:<><p>Acquisition is separate from recomputation and source inspection. Recorded executions are inspected through their existing scoped receipts.</p>
      {researchKeys.length ? <section aria-label="Original research request">
        <p>{researchFeedback}</p>
        <p>{!researchKey ? 'The original request reference is invalid. No request is submitted by opening this view.' : researchLookup.isFetching ? 'Reading the original saved request…' : requestRun ? 'Recorded request preview: ' + requestRun.status + '. Verify its exact Run receipt below.' : requestPageCurrent ? 'No saved Run was found for this original request yet. Refresh; do not submit another Start.' : 'The original request could not be verified. Refresh; no request will be resubmitted.'}</p>
        <Button type="button" variant="outline" disabled={!researchKey || researchLookup.isFetching || !active} onClick={() => researchLookup.refetch()}>Refresh original research request</Button>
      </section> : null}<AcquisitionRunHistory scope={scope} requestedRunId={requestRun?.runId} active={active && Boolean(inspection) && isCurrent()} locked={locked} canAcquire={authority?.canAcquire===true} busy={busy||preparing||pendingRequest} canRetryResearch={canRetryResearch} onRetry={run=>{if (!ownsResearchCommand() || !currentActive.current) return; if (isControlledAcquisitionRun(run) || isProviderFreeSearchRun(run) || isPublicResearchRun(run)) { if (canRetryResearch(run)) { setResearchRetryState({owner:retryOwner,run}); setResearchFeedback(isPublicResearchRun(run) ? "Research retry prepared locally. Open Configure research, inspect the saved settings and current server capability, then explicitly Start. The original request is preserved until that click." : "Fixture retry prepared locally. Open Configure research, inspect the saved settings, then explicitly Start. The original request is preserved until that click."); closeInspection() } return } setRetryFrom(run.runId);setBlocked(true);setFeedback({message:`Retry prepared for Run ${run.runId}. Refresh current acquisition data, inspect inputs and staged documents, then submit a new explicit operation.`});closeInspection()}} /><p>Sources connected: {sourceSummaryLoading?'Loading…':sourceSummary?.uniqueSourceCount??'Unavailable'} · Documents processed: {sourceProcessingLabel(sourceSummary,sourceSummaryLoading)}</p><p>{sourceProcessingExplanation(sourceSummary)}</p><p>Snapshot continuity receipt unavailable. Recorded evidence and decisions remain attached to their revision.</p><p>Accepted evidence: {countsLoading?'Loading…':evidenceStatusCounts?.accepted??'Unavailable'} · Evidence awaiting review: {countsLoading?'Loading…':evidenceStatusCounts?.pending??'Unavailable'}</p></>}
    </Dialog.Body><Dialog.Footer><Button size="sm" variant="outline" onClick={closeInspection}>Back to Context</Button></Dialog.Footer></Dialog> : null}
    {inspection === 'Customer-supplied research prompt' && active ? <CustomerResearchPrompt
      savedBrief={savedDraft} savedSettings={promptSettings} scope={{ ...scope, stateVersion: renderer?.runtimeInstance?.stateVersion, sessionRevision }}
      basisUpdatedAt={stamp} active={active} disabled={!canCopyPrompt} stagedChanges={Boolean(briefChanged || editor)} onClose={closeInspection} /> : null}
  </form><PostLockSubmissionPanel scope={{ runtimeInstanceId, customerId, tenantId }} renderer={renderer}
    contextKey={contextKey} route={availabilityRoute} canRead={availabilityReadAllowed} loading={availabilityLoading}
    error={availabilityError} active={active} locked={locked} /></>
}
