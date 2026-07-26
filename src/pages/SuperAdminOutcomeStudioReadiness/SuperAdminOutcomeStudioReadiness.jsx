import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdDownload, MdHistory, MdSwapHoriz, MdUploadFile, MdVerified } from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import {
  useDownloadOutcomeStudioTestReferenceMutation,
  useGetOutcomeStudioReadinessHistoryQuery,
  useGetOutcomeStudioReadinessQuery,
  useListOutcomeStudioTestReferencesQuery,
  useUpdateOutcomeStudioDevelopmentTestReadinessMutation,
} from '../../store/api/outcomeStudioReadinessApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  DECISION_OPTIONS,
  DEVELOPMENT_TEST_POLICY_VERSION,
  LEGACY_POLICY_VERSION,
  buildReadinessPayload,
  createBlankReadinessForm,
  formatReferenceFamily,
  mapReadinessApiFieldErrors,
  toReadinessForm,
  updateDecisionStatus,
  validateReadinessForm,
} from './outcomeStudioReadinessForm.js'
import {
  ReferenceApprovalDialog,
  ReferenceHistoryDialog,
  ReferenceSupersessionDialog,
  ReferenceUploadDialog,
} from './OutcomeStudioTestReferenceDialogs.jsx'
import { OutcomeStudioPagination } from './OutcomeStudioPagination.jsx'
import './SuperAdminOutcomeStudioReadiness.css'

const unwrap = (response) => response?.data ?? response ?? {}
const safeArray = (value) => Array.isArray(value) ? value : []
const text = (value) => String(value ?? '').trim()
const GATE_LABELS = {
  QUALITY_RUBRIC: 'Quality rubric',
  TEST_REFERENCE_EXAMPLES: 'TEST reference examples',
  SAFE_PROVIDER_POLICY: 'Safe provider policy',
  PRODUCT_TESTING_APPROVAL: 'Product testing approval',
}

const policyLabel = (policyVersion) => policyVersion === DEVELOPMENT_TEST_POLICY_VERSION
  ? 'Development/Test policy'
  : 'Legacy Slice 5A policy'
const verdictIsReady = (verdict) => ['READY_FOR_TESTING', 'SLICE_5_APPLICATION_READY'].includes(verdict)
const actorLabel = (actor) => typeof actor === 'object' ? actor?.name || actor?.email || actor?.id : actor
const blockerLabel = (blocker) => blocker?.message
  || [blocker?.code, blocker?.gate, blocker?.family, blocker?.decisionKey, blocker?.authority].filter(Boolean).join(' · ')
  || String(blocker)

function ProductDecisionFields({ idPrefix, decision, errors, onChange }) {
  const needsAttribution = decision.status !== 'OPEN'
  return (
    <div className="oes-readiness__decision-fields">
      <Select id={`${idPrefix}-status`} label="Product decision" value={decision.status} options={DECISION_OPTIONS} onChange={(event) => onChange('status', event.target.value)} error={errors.status} />
      {needsAttribution ? <>
        <Input id={`${idPrefix}-approver-name`} label="Product approver name" value={decision.productApproverName} onChange={(event) => onChange('productApproverName', event.target.value)} error={errors.productApproverName} maxLength={160} required fullWidth />
        <Input id={`${idPrefix}-approver-role`} label="Product approver role" value={decision.productApproverRole} onChange={(event) => onChange('productApproverRole', event.target.value)} error={errors.productApproverRole} maxLength={160} required fullWidth />
        <Textarea id={`${idPrefix}-rationale`} label="Decision rationale" value={decision.rationale} onChange={(event) => onChange('rationale', event.target.value)} error={errors.rationale} maxLength={1000} rows={4} required fullWidth />
      </> : <p className="oes-readiness__helper">No Product decision is recorded while this gate remains open.</p>}
    </div>
  )
}

function SuperAdminOutcomeStudioReadiness() {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const currentQuery = useGetOutcomeStudioReadinessQuery()
  const historyQuery = useGetOutcomeStudioReadinessHistoryQuery()
  const [referencePage, setReferencePage] = useState(1)
  const referencesQuery = useListOutcomeStudioTestReferencesQuery({ page: referencePage, pageSize: 25 })
  const [updateReadiness, updateState] = useUpdateOutcomeStudioDevelopmentTestReadinessMutation()
  const [downloadReference, downloadState] = useDownloadOutcomeStudioTestReferenceMutation()
  const [form, setForm] = useState(createBlankReadinessForm)
  const [errors, setErrors] = useState({})
  const [pendingPayload, setPendingPayload] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [approvalReference, setApprovalReference] = useState(null)
  const [supersessionReference, setSupersessionReference] = useState(null)
  const [historyReference, setHistoryReference] = useState(null)

  const projection = unwrap(currentQuery.data)
  const revision = Number.isSafeInteger(Number(projection.revision)) ? Number(projection.revision) : 0
  const projectionPolicy = projection.policyVersion || LEGACY_POLICY_VERSION
  const verdict = text(projection.verdict) || (projectionPolicy === DEVELOPMENT_TEST_POLICY_VERSION ? 'BLOCKED_FOR_TESTING' : 'SLICE_5_APPLICATION_BLOCKED')
  const blockers = safeArray(projection.blockers)
  const gateResults = safeArray(projection.gateResults)
  const historyData = unwrap(historyQuery.data)
  const history = safeArray(historyData.items ?? historyData.revisions ?? historyData)
  const references = safeArray(referencesQuery.data?.data ?? referencesQuery.data)
  const referenceMeta = referencesQuery.data?.meta ?? {}
  const referenceTotalPages = Math.max(1, Number(referenceMeta.totalPages) || 1)

  useEffect(() => {
    if (!currentQuery.data) return undefined
    const hydration = setTimeout(() => {
      setForm(toReadinessForm(currentQuery.data))
      setErrors({})
    }, 0)
    return () => clearTimeout(hydration)
  }, [currentQuery.data])

  const normalizedCurrentError = useMemo(() => currentQuery.error ? normalizeError(currentQuery.error) : null, [currentQuery.error])

  const updateSection = (section, field, value) => {
    setForm((current) => ({ ...current, [section]: { ...current[section], [field]: value } }))
    setErrors((current) => ({ ...current, [`${section}.${field}`]: undefined }))
  }

  const updateDecision = (section, field, value) => {
    setForm((current) => {
      const currentDecision = current[section].decision
      const decision = field === 'status' ? updateDecisionStatus(currentDecision, value) : { ...currentDecision, [field]: value }
      return { ...current, [section]: { ...current[section], decision } }
    })
    setErrors((current) => ({ ...current, [`${section}.decision.${field}`]: undefined }))
  }

  const refreshReferences = async () => {
    const result = await referencesQuery.refetch()
    const refreshedTotalPages = Math.max(1, Number(result?.data?.meta?.totalPages) || 1)
    if (referencePage > refreshedTotalPages) setReferencePage(refreshedTotalPages)
  }

  const handlePrepareSave = (event) => {
    event.preventDefault()
    const nextErrors = validateReadinessForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      addToast({ title: 'Check readiness details', description: 'Complete the highlighted Development/Test fields.', variant: 'error' })
      return
    }
    setPendingPayload(buildReadinessPayload(form, revision))
  }

  const handleConfirmSave = async () => {
    try {
      await updateReadiness(pendingPayload).unwrap()
      await Promise.all([currentQuery.refetch(), historyQuery.refetch(), referencesQuery.refetch()])
      setPendingPayload(null)
      addToast({ title: 'Development/Test readiness saved', description: 'The server recalculated the four gates. This records evidence only; it does not execute a provider.', variant: 'success' })
    } catch (error) {
      const conflict = Number(error?.status) === 409
      setErrors(mapReadinessApiFieldErrors(error))
      addToast({ title: conflict ? 'Readiness revision changed' : 'Unable to save readiness', description: conflict ? 'Another administrator saved a newer revision. The latest state has been reloaded.' : normalizeError(error).message, variant: conflict ? 'warning' : 'error' })
      if (conflict) {
        await Promise.all([currentQuery.refetch(), historyQuery.refetch(), referencesQuery.refetch()])
        setPendingPayload(null)
      }
    }
  }

  const handleDownload = async (reference) => {
    try {
      const attachment = await downloadReference(reference.referenceKey).unwrap()
      const objectUrl = URL.createObjectURL(attachment.blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = attachment.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      addToast({ title: 'Reference downloaded', description: attachment.filename, variant: 'success' })
    } catch (error) {
      addToast({ title: 'Unable to download reference', description: normalizeError(error).message, variant: 'error' })
    }
  }

  const referenceColumns = [
    { key: 'family', label: 'Family', render: (value) => formatReferenceFamily(value) },
    { key: 'title', label: 'Title' },
    { key: 'revision', label: 'Revision', align: 'right' },
    { key: 'status', label: 'Status', render: (value) => <Status variant={value === 'APPROVED' ? 'success' : value === 'SUPERSEDED' ? 'neutral' : 'warning'} size="sm">{value}</Status> },
    { key: 'createdAt', label: 'Recorded', render: (value) => value ? new Date(value).toLocaleString('en-GB') : 'Unavailable' },
    { key: 'actions', label: 'Actions', render: (_value, reference) => <div className="oes-readiness__row-actions">
      <Button variant="ghost" size="sm" leftIcon={<MdDownload aria-hidden="true" />} disabled={downloadState.isLoading} onClick={() => handleDownload(reference)}>Download</Button>
      <Button variant="ghost" size="sm" leftIcon={<MdHistory aria-hidden="true" />} onClick={() => setHistoryReference(reference)}>History</Button>
      {reference.status === 'DRAFT' ? <Button variant="outline" size="sm" leftIcon={<MdVerified aria-hidden="true" />} onClick={() => setApprovalReference(reference)}>Record approval</Button> : null}
      {reference.status === 'APPROVED' ? <Button variant="outline" size="sm" leftIcon={<MdSwapHoriz aria-hidden="true" />} onClick={() => setSupersessionReference(reference)}>Supersede</Button> : null}
    </div> },
  ]

  if (currentQuery.isLoading) return <div className="oes-readiness__loading"><Spinner size="lg" /><span>Loading application readiness</span></div>

  return (
    <section className="oes-readiness container" aria-labelledby="oes-readiness-page-title">
      <header className="oes-readiness__header">
        <div><p className="oes-readiness__eyebrow">Outcome Studio governance</p><h1 id="oes-readiness-page-title">Application Readiness Administration</h1><p>Record the four controls required for controlled TEST engineering. This page does not execute a provider or authorize production.</p></div>
        <Button variant="outline" size="sm" onClick={() => navigate('/super-admin/runtime-control')}>Back</Button>
      </header>

      <ErrorSupportPanel error={normalizedCurrentError} context="outcome-studio-readiness" />
      {!normalizedCurrentError ? <>
        <section className="oes-readiness__summary" aria-labelledby="readiness-summary-title">
          <div><p className="oes-readiness__eyebrow">Server-derived result</p><h2 id="readiness-summary-title">Current readiness</h2></div>
          <Status variant={verdictIsReady(verdict) ? 'success' : 'error'} showIcon>{verdict}</Status>
          <Badge variant="neutral" size="sm">Revision {revision}</Badge>
          <Badge variant={projectionPolicy === DEVELOPMENT_TEST_POLICY_VERSION ? 'info' : 'warning'} size="sm">{policyLabel(projectionPolicy)}</Badge>
          {projection.createdBy ? <span className="oes-readiness__server-meta">Recorded by {actorLabel(projection.createdBy)}</span> : null}
          {projection.createdAt ? <time className="oes-readiness__server-meta" dateTime={projection.createdAt}>{new Date(projection.createdAt).toLocaleString('en-GB')}</time> : null}
          {gateResults.length ? <div className="oes-readiness__gate-strip" aria-label="Development/Test gate results">{gateResults.map((gate) => <div key={gate.gate}><span>{GATE_LABELS[gate.gate] ?? gate.gate}</span><Status variant={gate.status === 'PASSED' ? 'success' : 'error'} size="sm">{gate.status}</Status></div>)}</div> : null}
          <div className="oes-readiness__blockers"><h3>Current blockers</h3>{blockers.length ? <ul>{blockers.map((blocker, index) => <li key={`${blocker.code ?? blocker}-${index}`}>{blockerLabel(blocker)}</li>)}</ul> : <p>No blockers reported by the server.</p>}</div>
        </section>

        {projectionPolicy !== DEVELOPMENT_TEST_POLICY_VERSION ? <aside className="oes-readiness__policy-notice" aria-label="Legacy policy transition"><strong>Legacy record retained</strong><p>Revision {revision} remains immutable under the legacy policy. The form below starts a blank Development/Test record and uses this revision only for concurrency control.</p></aside> : null}

        <section className="oes-readiness__section" aria-labelledby="references-title">
          <div className="oes-readiness__section-heading"><div><p className="oes-readiness__gate-number">Gate 2</p><h2 id="references-title">TEST reference examples</h2><p>Internally stored Product-approved PDFs for the three deliverable families.</p></div><Button leftIcon={<MdUploadFile aria-hidden="true" />} onClick={() => setUploadOpen(true)}>Upload reference</Button></div>
          {referencesQuery.isLoading || referencesQuery.isFetching ? <div className="oes-readiness__inline-loading"><Spinner size="sm" /><span>Loading TEST references</span></div> : referencesQuery.error ? <ErrorSupportPanel error={normalizeError(referencesQuery.error)} context="outcome-studio-test-references" /> : <Table columns={referenceColumns} data={references.map((item) => ({ ...item, id: item.referenceKey }))} variant="striped" size="compact" hoverable loading={false} emptyMessage="No TEST references have been uploaded." ariaLabel="Outcome Studio TEST references" />}
          {referencesQuery.data?.meta ? <p className="oes-readiness__pagination-summary">Showing {references.length} of {referencesQuery.data.meta.total ?? references.length} references.</p> : null}
          <p className="oes-readiness__governance-note">Reference approval or supersession does not alter the immutable current readiness verdict. Review and record a new readiness revision after changing a reference decision.</p>
          <OutcomeStudioPagination page={referencePage} totalPages={referenceTotalPages} isFetching={referencesQuery.isFetching} onPageChange={setReferencePage} ariaLabel="TEST reference catalogue pagination" />
        </section>

        <form className="oes-readiness__readiness-form" onSubmit={handlePrepareSave} noValidate>
          <section className="oes-readiness__section" aria-labelledby="rubric-title">
            <div><p className="oes-readiness__gate-number">Gate 1</p><h2 id="rubric-title">Quality rubric</h2><p>Name the Product-approved quality rubric and acceptance threshold.</p></div>
            <div className="oes-readiness__form-grid"><Input id="rubric-key" label="Rubric key" value={form.rubric.rubricKey} onChange={(event) => updateSection('rubric', 'rubricKey', event.target.value)} error={errors['rubric.rubricKey']} maxLength={140} required fullWidth /><Input id="rubric-version" label="Rubric version" value={form.rubric.rubricVersion} onChange={(event) => updateSection('rubric', 'rubricVersion', event.target.value)} error={errors['rubric.rubricVersion']} maxLength={80} required fullWidth /><Input id="rubric-threshold" type="number" min="0" max="100" label="Acceptance threshold" value={form.rubric.threshold} onChange={(event) => updateSection('rubric', 'threshold', event.target.value)} error={errors['rubric.threshold']} required fullWidth /></div>
            <ProductDecisionFields idPrefix="rubric-decision" decision={form.rubric.decision} errors={{ status: errors['rubric.decision.status'], productApproverName: errors['rubric.decision.productApproverName'], productApproverRole: errors['rubric.decision.productApproverRole'], rationale: errors['rubric.decision.rationale'] }} onChange={(field, value) => updateDecision('rubric', field, value)} />
          </section>

          <section className="oes-readiness__section" aria-labelledby="provider-title">
            <div><p className="oes-readiness__gate-number">Gate 3</p><h2 id="provider-title">Safe provider policy</h2><p>Bind the approved provider and model to the fixed TEST-only, fail-closed safe-context policy.</p></div>
            <div className="oes-readiness__form-grid"><Input id="provider-key" label="Provider key" value={form.providerPolicy.providerKey} onChange={(event) => updateSection('providerPolicy', 'providerKey', event.target.value)} error={errors['providerPolicy.providerKey']} maxLength={140} required fullWidth /><Input id="provider-model" label="Model" value={form.providerPolicy.model} onChange={(event) => updateSection('providerPolicy', 'model', event.target.value)} error={errors['providerPolicy.model']} maxLength={160} required fullWidth /></div>
            <dl className="oes-readiness__fixed-policy" aria-label="Server-owned provider controls"><div><dt>Environment</dt><dd>TEST</dd></div><div><dt>Safe-context policy</dt><dd>OUTCOME_STUDIO_PROVIDER_SAFE_CONTEXT_V1</dd></div><div><dt>Failure posture</dt><dd>FAIL_CLOSED</dd></div></dl>
            <ProductDecisionFields idPrefix="provider-decision" decision={form.providerPolicy.decision} errors={{ status: errors['providerPolicy.decision.status'], productApproverName: errors['providerPolicy.decision.productApproverName'], productApproverRole: errors['providerPolicy.decision.productApproverRole'], rationale: errors['providerPolicy.decision.rationale'] }} onChange={(field, value) => updateDecision('providerPolicy', field, value)} />
          </section>

          <section className="oes-readiness__section" aria-labelledby="testing-title">
            <div><p className="oes-readiness__gate-number">Gate 4</p><h2 id="testing-title">Product testing approval</h2><p>Record Product&apos;s decision to permit controlled TEST engineering validation.</p></div>
            <ProductDecisionFields idPrefix="testing-decision" decision={form.testingApproval.decision} errors={{ status: errors['testingApproval.decision.status'], productApproverName: errors['testingApproval.decision.productApproverName'], productApproverRole: errors['testingApproval.decision.productApproverRole'], rationale: errors['testingApproval.decision.rationale'] }} onChange={(field, value) => updateDecision('testingApproval', field, value)} />
          </section>
          <div className="oes-readiness__actions"><Button type="submit" disabled={updateState.isLoading}>Review readiness revision</Button></div>
        </form>

        <section className="oes-readiness__section" aria-labelledby="history-title">
          <div><h2 id="history-title">Readiness history</h2><p>Immutable server history, labelled by the policy that created each revision.</p></div>
          {historyQuery.isLoading || historyQuery.isFetching ? <div className="oes-readiness__inline-loading"><Spinner size="sm" /><span>Loading readiness history</span></div> : historyQuery.error ? <ErrorSupportPanel error={normalizeError(historyQuery.error)} context="outcome-studio-readiness-history" /> : history.length === 0 ? <p className="oes-readiness__empty">No saved revisions yet.</p> : <div className="oes-readiness__history" role="list" aria-label="Readiness revision history">{history.map((item) => { const itemPolicy = item.policyVersion || LEGACY_POLICY_VERSION; return <article key={item.id ?? item._id ?? `${itemPolicy}-${item.revision}`} role="listitem"><strong>Revision {item.revision}</strong><Badge variant={itemPolicy === DEVELOPMENT_TEST_POLICY_VERSION ? 'info' : 'warning'} size="sm">{policyLabel(itemPolicy)}</Badge><Status variant={verdictIsReady(item.verdict) ? 'success' : 'error'} size="sm">{item.verdict ?? 'BLOCKED'}</Status><span>{actorLabel(item.createdBy) || 'Unknown administrator'}</span><time dateTime={item.createdAt}>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : 'Date unavailable'}</time></article> })}</div>}
        </section>
      </> : null}

      <Dialog open={Boolean(pendingPayload)} onClose={() => !updateState.isLoading && setPendingPayload(null)} closeOnBackdropClick={!updateState.isLoading} closeOnEscape={!updateState.isLoading} size="sm" aria-labelledby="readiness-confirm-title">
        <Dialog.Header><h2 id="readiness-confirm-title">Record readiness revision?</h2></Dialog.Header>
        <Dialog.Body><p>This creates an immutable Development/Test readiness revision from the Product decisions shown in the form. The server will derive the four-gate verdict.</p><p className="oes-readiness__governance-note">This does not authorize production and does not execute a provider.</p></Dialog.Body>
        <Dialog.Footer><Button variant="outline" disabled={updateState.isLoading} onClick={() => setPendingPayload(null)}>Cancel</Button><Button loading={updateState.isLoading} disabled={updateState.isLoading} onClick={handleConfirmSave}>Record revision</Button></Dialog.Footer>
      </Dialog>
      <ReferenceUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onCompleted={refreshReferences} />
      <ReferenceApprovalDialog reference={approvalReference} onClose={() => setApprovalReference(null)} onCompleted={refreshReferences} />
      <ReferenceSupersessionDialog reference={supersessionReference} onClose={() => setSupersessionReference(null)} onCompleted={refreshReferences} />
      <ReferenceHistoryDialog reference={historyReference} onClose={() => setHistoryReference(null)} />
    </section>
  )
}

export default SuperAdminOutcomeStudioReadiness
