import { useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import {
  useApproveOutcomeStudioTestReferenceMutation,
  useGetOutcomeStudioTestReferenceHistoryQuery,
  useListOutcomeStudioTestReferencesQuery,
  useSupersedeOutcomeStudioTestReferenceMutation,
  useUploadOutcomeStudioTestReferenceMutation,
} from '../../store/api/outcomeStudioReadinessApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  REFERENCE_FAMILIES,
  buildReferenceUploadPayload,
  createBlankReferenceApprovalForm,
  createBlankReferenceSupersessionForm,
  createBlankReferenceUploadForm,
  formatReferenceFamily,
  mapReferenceApiFieldErrors,
  readReferenceFileBase64,
  validateReferenceApprovalForm,
  validateReferenceSupersessionForm,
  validateReferenceUploadForm,
} from './outcomeStudioReadinessForm.js'
import { OutcomeStudioPagination } from './OutcomeStudioPagination.jsx'

const decisionErrorTitle = (status) => Number(status) === 409 ? 'Reference revision changed' : 'Unable to record reference decision'

export function ReferenceUploadDialog({ open, onClose, onCompleted }) {
  const { addToast } = useToaster()
  const [uploadReference, uploadState] = useUploadOutcomeStudioTestReferenceMutation()
  const [form, setForm] = useState(createBlankReferenceUploadForm)
  const [errors, setErrors] = useState({})

  const resetAndClose = () => {
    setForm(createBlankReferenceUploadForm())
    setErrors({})
    onClose()
  }

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateReferenceUploadForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      addToast({ title: 'Check reference details', description: 'Complete the highlighted fields.', variant: 'error' })
      return
    }
    let contentBase64
    try {
      contentBase64 = await readReferenceFileBase64(form.file)
    } catch (error) {
      setErrors({ file: error.message })
      addToast({ title: 'Unable to read PDF', description: error.message, variant: 'error' })
      return
    }
    try {
      await uploadReference(buildReferenceUploadPayload(form, contentBase64)).unwrap()
      await onCompleted()
      addToast({ title: 'TEST reference uploaded', description: 'The PDF is stored as a draft and still requires a real Product approval.', variant: 'success' })
      resetAndClose()
    } catch (error) {
      setErrors(mapReferenceApiFieldErrors(error))
      addToast({ title: 'Unable to upload TEST reference', description: normalizeError(error).message, variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={() => !uploadState.isLoading && resetAndClose()} closeOnBackdropClick={!uploadState.isLoading} closeOnEscape={!uploadState.isLoading} size="md" aria-labelledby="reference-upload-title">
      <Dialog.Header><h2 id="reference-upload-title">Upload TEST reference</h2></Dialog.Header>
      <Dialog.Body>
        <form className="oes-readiness__dialog-form" onSubmit={handleSubmit} noValidate>
          <Select id="reference-upload-family" label="Deliverable family" value={form.family} options={REFERENCE_FAMILIES.map(({ key, label }) => ({ value: key, label }))} onChange={(event) => setField('family', event.target.value)} error={errors.family} />
          <Input id="reference-upload-title-field" label="Reference title" value={form.title} onChange={(event) => setField('title', event.target.value)} error={errors.title} maxLength={200} required fullWidth />
          <Textarea id="reference-upload-purpose" label="Purpose (optional)" value={form.purpose} onChange={(event) => setField('purpose', event.target.value)} error={errors.purpose} maxLength={1000} rows={3} fullWidth />
          <label className="oes-readiness__file-field" htmlFor="reference-upload-file">
            <span>PDF file</span>
            <input
              id="reference-upload-file"
              type="file"
              accept=".pdf,application/pdf"
              disabled={uploadState.isLoading}
              aria-invalid={Boolean(errors.file)}
              aria-describedby={errors.file ? 'reference-upload-file-error' : undefined}
              onChange={(event) => setField('file', event.target.files?.[0] ?? null)}
            />
          </label>
          {errors.file ? <p id="reference-upload-file-error" className="oes-readiness__field-error" role="alert">{errors.file}</p> : null}
          <p className="oes-readiness__helper">PDF only, up to 10 MB. Uploading creates a draft; it does not approve the reference or change readiness.</p>
          <div className="oes-readiness__dialog-actions">
            <Button type="button" variant="outline" disabled={uploadState.isLoading} onClick={resetAndClose}>Cancel</Button>
            <Button type="submit" loading={uploadState.isLoading} disabled={uploadState.isLoading}>Upload PDF</Button>
          </div>
        </form>
      </Dialog.Body>
    </Dialog>
  )
}

export function ReferenceApprovalDialog({ reference, onClose, onCompleted }) {
  const { addToast } = useToaster()
  const [approveReference, approveState] = useApproveOutcomeStudioTestReferenceMutation()
  const [form, setForm] = useState(createBlankReferenceApprovalForm)
  const [errors, setErrors] = useState({})
  const [isRecoveringConflict, setIsRecoveringConflict] = useState(false)
  const isBusy = approveState.isLoading || isRecoveringConflict

  const resetAndClose = () => {
    setForm(createBlankReferenceApprovalForm())
    setErrors({})
    onClose()
  }

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isRecoveringConflict) return
    const nextErrors = validateReferenceApprovalForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    try {
      await approveReference({ referenceKey: reference.referenceKey, expectedRevision: reference.revision, ...form }).unwrap()
      await onCompleted()
      addToast({ title: 'Product approval recorded', description: 'Review and record a new readiness revision to recalculate the immutable current verdict.', variant: 'success' })
      resetAndClose()
    } catch (error) {
      const conflict = Number(error?.status) === 409
      setErrors(mapReferenceApiFieldErrors(error))
      if (conflict) {
        setIsRecoveringConflict(true)
        try {
          await onCompleted()
        } finally {
          resetAndClose()
          setIsRecoveringConflict(false)
        }
      }
      addToast({ title: decisionErrorTitle(error?.status), description: normalizeError(error).message, variant: conflict ? 'warning' : 'error' })
    }
  }

  return (
    <Dialog open={Boolean(reference)} onClose={() => !isBusy && resetAndClose()} closeOnBackdropClick={!isBusy} closeOnEscape={!isBusy} size="md" aria-labelledby="reference-approval-title">
      <Dialog.Header><h2 id="reference-approval-title">Record Product approval</h2></Dialog.Header>
      <Dialog.Body>
        <form className="oes-readiness__dialog-form" onSubmit={handleSubmit} noValidate>
          <p><strong>{reference?.title}</strong> | {formatReferenceFamily(reference?.family)} | Revision {reference?.revision}</p>
          <p className="oes-readiness__governance-note">Only submit after Product has approved this exact stored PDF. You are recording Product&apos;s decision; the server records your authenticated identity separately.</p>
          <Input id="reference-approver-name" label="Product approver name" value={form.approverName} onChange={(event) => setField('approverName', event.target.value)} error={errors.approverName} maxLength={160} disabled={isBusy} required fullWidth />
          <Input id="reference-approver-role" label="Product approver role" value={form.approverRole} onChange={(event) => setField('approverRole', event.target.value)} error={errors.approverRole} maxLength={160} disabled={isBusy} required fullWidth />
          <Textarea id="reference-approval-rationale" label="Approval rationale" value={form.rationale} onChange={(event) => setField('rationale', event.target.value)} error={errors.rationale} maxLength={1000} rows={4} disabled={isBusy} required fullWidth />
          <div className="oes-readiness__dialog-actions">
            <Button type="button" variant="outline" disabled={isBusy} onClick={resetAndClose}>Cancel</Button>
            <Button type="submit" loading={isBusy} disabled={isBusy}>Record approval</Button>
          </div>
        </form>
      </Dialog.Body>
    </Dialog>
  )
}

export function ReferenceSupersessionDialog({ reference, onClose, onCompleted }) {
  const { addToast } = useToaster()
  const [supersedeReference, supersedeState] = useSupersedeOutcomeStudioTestReferenceMutation()
  const [form, setForm] = useState(createBlankReferenceSupersessionForm)
  const [errors, setErrors] = useState({})
  const [candidatePage, setCandidatePage] = useState(1)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [isRecoveringConflict, setIsRecoveringConflict] = useState(false)
  const isBusy = supersedeState.isLoading || isRecoveringConflict
  const candidateQuery = useListOutcomeStudioTestReferencesQuery({ page: candidatePage, pageSize: 25 }, { skip: !reference })
  const candidateItems = Array.isArray(candidateQuery.data?.data) ? candidateQuery.data.data : []
  const replacements = candidateItems.filter((item) => item.referenceKey !== reference?.referenceKey && item.family === reference?.family && item.status === 'APPROVED')
  const replacementOptionsByKey = new Map()
  if (selectedCandidate) replacementOptionsByKey.set(selectedCandidate.referenceKey, selectedCandidate)
  replacements.forEach((item) => replacementOptionsByKey.set(item.referenceKey, item))
  const replacementOptions = [...replacementOptionsByKey.values()]
  const candidateMeta = candidateQuery.data?.meta ?? {}
  const candidateTotalPages = Math.max(1, Number(candidateMeta.totalPages) || 1)

  const resetAndClose = () => {
    setForm(createBlankReferenceSupersessionForm())
    setErrors({})
    setCandidatePage(1)
    setSelectedCandidate(null)
    onClose()
  }

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isRecoveringConflict) return
    const nextErrors = validateReferenceSupersessionForm(form, reference, replacementOptions)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    try {
      await supersedeReference({ referenceKey: reference.referenceKey, expectedRevision: reference.revision, ...form }).unwrap()
      await onCompleted()
      addToast({ title: 'TEST reference superseded', description: 'Review and record a new readiness revision to recalculate the immutable current verdict.', variant: 'success' })
      resetAndClose()
    } catch (error) {
      const conflict = Number(error?.status) === 409
      setErrors(mapReferenceApiFieldErrors(error))
      if (conflict) {
        setIsRecoveringConflict(true)
        try {
          await onCompleted()
        } finally {
          resetAndClose()
          setIsRecoveringConflict(false)
        }
      }
      addToast({ title: decisionErrorTitle(error?.status), description: normalizeError(error).message, variant: conflict ? 'warning' : 'error' })
    }
  }

  return (
    <Dialog open={Boolean(reference)} onClose={() => !isBusy && resetAndClose()} closeOnBackdropClick={!isBusy} closeOnEscape={!isBusy} size="md" aria-labelledby="reference-supersession-title">
      <Dialog.Header><h2 id="reference-supersession-title">Supersede TEST reference</h2></Dialog.Header>
      <Dialog.Body>
        <form className="oes-readiness__dialog-form" onSubmit={handleSubmit} noValidate>
          <p><strong>{reference?.title}</strong> | Revision {reference?.revision}</p>
          {candidateQuery.isLoading ? <div className="oes-readiness__inline-loading"><Spinner size="sm" /><span>Loading replacement candidates</span></div> : candidateQuery.error ? <ErrorSupportPanel error={normalizeError(candidateQuery.error)} context="outcome-studio-reference-candidates" /> : <>
            <Select id="reference-replacement" label="Approved replacement" value={form.replacementReferenceKey} options={[{ value: '', label: replacementOptions.length ? 'Select replacement' : 'No approved same-family reference on this page' }, ...replacementOptions.map((item) => ({ value: item.referenceKey, label: `${item.title} | Revision ${item.revision}` }))]} onChange={(event) => {
              const nextKey = event.target.value
              setField('replacementReferenceKey', nextKey)
              setSelectedCandidate(replacementOptions.find((item) => item.referenceKey === nextKey) ?? null)
            }} error={errors.replacementReferenceKey} disabled={isBusy || !replacementOptions.length} />
            <OutcomeStudioPagination page={candidatePage} totalPages={candidateTotalPages} isFetching={candidateQuery.isFetching} onPageChange={setCandidatePage} ariaLabel="Replacement candidate pagination" />
          </>}
          <Textarea id="reference-supersession-reason" label="Reason" value={form.reason} onChange={(event) => setField('reason', event.target.value)} error={errors.reason} maxLength={1000} rows={4} disabled={isBusy} required fullWidth />
          <div className="oes-readiness__dialog-actions">
            <Button type="button" variant="outline" disabled={isBusy} onClick={resetAndClose}>Cancel</Button>
            <Button type="submit" loading={isBusy} disabled={isBusy || !replacementOptions.length}>Supersede reference</Button>
          </div>
        </form>
      </Dialog.Body>
    </Dialog>
  )
}

export function ReferenceHistoryDialog({ reference, onClose }) {
  const [page, setPage] = useState(1)
  const historyQuery = useGetOutcomeStudioTestReferenceHistoryQuery({ referenceKey: reference?.referenceKey ?? '', page, pageSize: 25 }, { skip: !reference })
  const items = Array.isArray(historyQuery.data?.data) ? historyQuery.data.data : []
  const meta = historyQuery.data?.meta ?? {}
  const totalPages = Math.max(1, Number(meta.totalPages) || 1)
  const resetAndClose = () => {
    setPage(1)
    onClose()
  }
  return (
    <Dialog open={Boolean(reference)} onClose={resetAndClose} size="lg" aria-labelledby="reference-history-title">
      <Dialog.Header><h2 id="reference-history-title">Reference history</h2></Dialog.Header>
      <Dialog.Body>
        <p>{reference?.title} | {formatReferenceFamily(reference?.family)}</p>
        {historyQuery.isLoading ? <div className="oes-readiness__inline-loading"><Spinner size="sm" /><span>Loading reference history</span></div> : historyQuery.error ? <ErrorSupportPanel error={normalizeError(historyQuery.error)} context="outcome-studio-reference-history" /> : items.length === 0 ? <p className="oes-readiness__empty">No reference history is available.</p> : <div className="oes-readiness__history" role="list" aria-label="TEST reference revision history">{items.map((item) => <article key={`${item.referenceKey}-${item.revision}`} role="listitem"><strong>Revision {item.revision}</strong><Status variant={item.status === 'APPROVED' ? 'success' : item.status === 'SUPERSEDED' ? 'neutral' : 'warning'} size="sm">{item.status}</Status><span>{item.productApproval?.approverName ?? 'Approval not recorded'}</span><time dateTime={item.createdAt}>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : 'Date unavailable'}</time></article>)}</div>}
        {historyQuery.isFetching && !historyQuery.isLoading ? <p className="oes-readiness__helper">Refreshing reference history...</p> : null}
        <OutcomeStudioPagination page={page} totalPages={totalPages} isFetching={historyQuery.isFetching} onPageChange={setPage} ariaLabel="Reference history pagination" />
      </Dialog.Body>
      <Dialog.Footer><Button variant="outline" onClick={resetAndClose}>Close</Button></Dialog.Footer>
    </Dialog>
  )
}
