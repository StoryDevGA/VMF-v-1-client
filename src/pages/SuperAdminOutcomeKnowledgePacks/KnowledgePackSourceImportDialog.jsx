import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { usePreviewKnowledgePackImportMetadataMutation } from '../../store/api/outcomeKnowledgePacksApi.js'
import {
  EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM, SOURCE_DOCUMENT_MAX_BYTES, IMPORT_FIELDS,
  KNOWLEDGE_PACK_EXECUTION_MODE_OPTIONS, KNOWLEDGE_PACK_LAYER_OPTIONS,
  KNOWLEDGE_PACK_PURPOSE_CATEGORY_OPTIONS, KNOWLEDGE_PACK_VISIBILITY_OPTIONS,
  KNOWLEDGE_PACK_WORKSPACE_COMPATIBILITY_OPTIONS, OUTCOME_KNOWLEDGE_PACK_AUTHORING_TYPE_OPTIONS,
} from './superAdminOutcomeKnowledgePacks.constants.js'

const steps = ['Source', 'Identity', 'Classification', 'Runtime', 'Advanced']
const stepFields = [
  ['filename', 'extractedText'], ['label', 'knowledgeAssetId', 'capabilityKey', 'description'],
  ['packType', 'purposeCategory', 'knowledgeLayer', 'workspaceCompatibility'],
  ['executionMode', 'visibility', 'runtimeConsumers', 'customerId', 'tenantId'],
  ['packKey', 'semanticVersion', 'schemaVersion', 'sourceAuthority', 'metadataOverrides'],
]

function containImportFocus(event) {
  if (event.key !== 'Tab') return
  const dialog = event.currentTarget
  const controls = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
    .filter((element) => {
      if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden], [inert]')) return false
      for (let node = element; node && node !== dialog; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility === 'hidden') return false
      }
      return true
    })
  const first = controls[0]
  const last = controls.at(-1)
  const current = document.activeElement
  if (!first) return
  if (current === dialog || !dialog.contains(current) || (event.shiftKey ? current === first : current === last)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  }
}

export function KnowledgePackSourceImportDialog({ open, form, error, fieldErrors = {}, isLoading,
  onClose, onSubmit, onFormChange, onFileMetadata, onFileReadError, readSourceFile }) {
  const [step, setStep] = useState(0)
  const [reading, setReading] = useState(false)
  const generation = useRef(0)
  const heading = useRef(null)
  const [previewMetadata] = usePreviewKnowledgePackImportMetadataMutation()
  useEffect(() => {
    generation.current += 1
    setStep(0)
    setReading(false)
    return () => { generation.current += 1 }
  }, [open])
  useEffect(() => {
    const first = stepFields.findIndex((keys) => keys.some((key) => fieldErrors[key]))
    if (first >= 0) setStep(first)
  }, [fieldErrors])
  useEffect(() => { if (open) heading.current?.focus() }, [step, open])
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])
  if (!open) return null
  const busy = reading || isLoading
  const attribution = (key) => form.metadataOverrides?.includes(key)
    ? 'Manual override — validated before creation.'
    : Object.hasOwn(form.sourceValues || {}, key) ? 'From selected file.' : 'Not declared; enter if required.'
  const input = (key, label, required = false) => (
    <Input id={`knowledge-pack-source-import-${key}`} label={label} size="sm"
      value={form[key] || ''} onChange={(event) => onFormChange(key, event.target.value)}
      error={fieldErrors[key]} helperText={IMPORT_FIELDS.includes(key) ? attribution(key) : undefined}
      required={required} disabled={busy} fullWidth />
  )
  const select = (key, label, options, required = false) => (
    <Select id={`knowledge-pack-source-import-${key}`} label={label} size="sm"
      value={form[key] || ''} options={[{ value: '', label: 'Select…' }, ...options]}
      onChange={(event) => onFormChange(key, event.target.value)}
      error={fieldErrors[key]} helperText={attribution(key)} required={required} disabled={busy} />
  )
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const request = ++generation.current
    setReading(true)
    onFileMetadata({ ...EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM, sourceReady: false,
      sourceValues: {}, metadataOverrides: [], _fieldErrors: {} })
    try {
      if (file.size > SOURCE_DOCUMENT_MAX_BYTES) throw new Error(`Source document must be ${SOURCE_DOCUMENT_MAX_BYTES} bytes or fewer.`)
      const loaded = await readSourceFile(file)
      if (request !== generation.current) return
      let values = {}
      let errors = {}
      let sourceValues = {}
      if (loaded.contentFormat === 'MARKDOWN') {
        const response = await previewMetadata({ extractedText: loaded.extractedText }).unwrap()
        if (request !== generation.current) return
        const result = response.data
        if (!result?.metadata || !result?.fieldErrors || !result?.sourceMetadata) throw new Error('Metadata preview returned an incomplete response. Select the file again.')
        values = Object.fromEntries(IMPORT_FIELDS.map((key) => [key, ['workspaceCompatibility', 'runtimeConsumers'].includes(key) ? [] : '']))
        Object.assign(values, result.metadata)
        errors = result.fieldErrors
        sourceValues = result.sourceMetadata
        for (const key of ['executionMode', 'visibility']) {
          if (!Object.hasOwn(sourceValues, key) && !errors[key]) values[key] = EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM[key]
        }
      }
      onFileMetadata({ ...loaded, ...values, sourceValues, metadataOverrides: [],
        sourceReady: !errors.extractedText, _fieldErrors: errors })
    } catch (err) {
      if (request === generation.current) onFileReadError(err)
    } finally {
      if (request === generation.current) setReading(false)
    }
  }
  const close = () => { generation.current += 1; onClose() }
  return (
    <Dialog open={open} onClose={close} size="xl" className="knowledge-source-import" aria-labelledby="knowledge-source-import-title" onKeyDown={containImportFocus}>
      <form className="knowledge-source-import__form" onSubmit={async (event) => {
        event.preventDefault()
        if (step < steps.length - 1) { event.preventDefault(); if (form.sourceReady && !busy) setStep(step + 1); return }
        if (!form.sourceReady || busy) { event.preventDefault(); return }
        if (form.contentFormat === 'MARKDOWN') {
          const request = ++generation.current
          setReading(true)
          try {
            const response = await previewMetadata({ extractedText: form.extractedText,
              metadata: Object.fromEntries(IMPORT_FIELDS
                .filter((key) => !(key === 'purposeCategory' && !form[key] && !Object.hasOwn(form.sourceValues || {}, key)))
                .map((key) => [key, form[key]])),
              metadataOverrides: form.metadataOverrides,
            }).unwrap()
            if (request !== generation.current) return
            if (!response.data?.fieldErrors) throw new Error('Metadata validation returned an incomplete response.')
            if (Object.keys(response.data.fieldErrors).length) {
              onFileMetadata({ _fieldErrors: response.data.fieldErrors })
              return
            }
            onSubmit(event)
          } catch (err) {
            if (request === generation.current) onFileReadError(err)
          } finally {
            if (request === generation.current) setReading(false)
          }
        } else onSubmit(event)
      }} noValidate>
        <Dialog.Header>
          <h2 id="knowledge-source-import-title">Import Source Document</h2>
          <p className="knowledge-source-import__progress" aria-live="polite">Step {step + 1} of {steps.length}: {steps[step]}</p>
          {form.filename && <p className="knowledge-source-import__filename" title={form.filename}>{form.filename}</p>}
        </Dialog.Header>
        <Dialog.Body className="knowledge-source-import__body">
          <h3 ref={heading} tabIndex={-1}>{steps[step]}</h3>
          {error && <p role="alert" className="super-admin-outcome-knowledge-packs__error">{error}</p>}
          {step === 0 && <>
            <label className="super-admin-outcome-knowledge-packs__file-field">
              <span>Source document file</span>
              <input type="file" accept=".md,.markdown,.txt,.yaml,.yml,.json,.docx,.pdf" onChange={handleFileChange} disabled={isLoading}
                aria-describedby="knowledge-source-file-status" aria-invalid={Boolean(fieldErrors.filename || fieldErrors.extractedText)} />
            </label>
            <p id="knowledge-source-file-status" role="status">{reading ? 'Reading source metadata…' : form.filename || 'Select a source file to begin.'}</p>
            {(fieldErrors.filename || fieldErrors.extractedText) && <p role="alert">{fieldErrors.filename || fieldErrors.extractedText}</p>}
            {form.filename && <Textarea label="Extracted text preview" value={form.extractedText} readOnly rows={5} resize="none" fullWidth />}
          </>}
          {step === 1 && <div className="knowledge-source-import__grid">
            {input('label', 'Name', true)}{input('knowledgeAssetId', 'Knowledge Asset ID', true)}
            {input('capabilityKey', 'Capability Key', true)}
            <Textarea id="knowledge-pack-source-import-description" label="Description" value={form.description} rows={2} resize="none"
              onChange={(event) => onFormChange('description', event.target.value)} error={fieldErrors.description}
              helperText={attribution('description')} disabled={busy} fullWidth />
          </div>}
          {step === 2 && <div className="knowledge-source-import__grid">
            {select('packType', 'Draft Pack Type', OUTCOME_KNOWLEDGE_PACK_AUTHORING_TYPE_OPTIONS, true)}
            {select('purposeCategory', 'Purpose Category', KNOWLEDGE_PACK_PURPOSE_CATEGORY_OPTIONS)}
            {select('knowledgeLayer', 'Knowledge Layer', KNOWLEDGE_PACK_LAYER_OPTIONS, true)}
            <fieldset className="knowledge-source-import__workspaces" aria-describedby="knowledge-source-workspace-error">
              <legend>Workspace Compatibility</legend>
              {KNOWLEDGE_PACK_WORKSPACE_COMPATIBILITY_OPTIONS.map(({ value, label }) => <Tickbox key={value}
                label={label} size="sm" checked={form.workspaceCompatibility.includes(value)} disabled={busy}
                onChange={(event) => onFormChange('workspaceCompatibility', event.target.checked
                  ? [...form.workspaceCompatibility, value] : form.workspaceCompatibility.filter((item) => item !== value))} />)}
              <p id="knowledge-source-workspace-error" role={fieldErrors.workspaceCompatibility ? 'alert' : undefined}>
                {fieldErrors.workspaceCompatibility || attribution('workspaceCompatibility')}
              </p>
            </fieldset>
          </div>}
          {step === 3 && <div className="knowledge-source-import__grid">
            {select('executionMode', 'Execution Mode', KNOWLEDGE_PACK_EXECUTION_MODE_OPTIONS)}
            {select('visibility', 'Visibility', KNOWLEDGE_PACK_VISIBILITY_OPTIONS)}
            <Input id="knowledge-pack-source-import-runtimeConsumers" label="Runtime Consumers" size="sm" value={(form.runtimeConsumers || []).join(', ')}
              onChange={(event) => onFormChange('runtimeConsumers', event.target.value ? event.target.value.split(',').map((item) => item.trim()) : [])}
              error={fieldErrors.runtimeConsumers} helperText={`${attribution('runtimeConsumers')} Comma-separated names; descriptive only.`} disabled={busy} fullWidth />
            {form.visibility === 'CUSTOMER' && input('customerId', 'Customer Id', true)}
            {form.visibility === 'TENANT' && input('tenantId', 'Tenant Id', true)}
          </div>}
          {step === 4 && <section className="knowledge-source-import__advanced" aria-label="Advanced/system metadata" tabIndex={0}>
            <p>{form.label}</p>
            <div className="knowledge-source-import__grid">
              {input('packKey', 'Pack Key')}{input('semanticVersion', 'Semantic Version', true)}
              {input('schemaVersion', 'Schema Version', true)}{input('sourceAuthority', 'Source Authority')}
            </div>
            <p>Source: {form.filename} ({form.contentFormat})</p>
            <p>Manual overrides: {form.metadataOverrides?.join(', ') || 'None'}</p>
            {fieldErrors.metadataOverrides && <p role="alert">{fieldErrors.metadataOverrides}</p>}
            <p>Imported documents are saved as drafts. Validation and activation stay separate.</p>
          </section>}
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" onClick={close} disabled={isLoading}>Cancel</Button>
          {step > 0 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={busy}>Back</Button>}
          {step < steps.length - 1
            ? <Button key="next" type="button" variant="primary" onClick={(event) => { event.preventDefault(); setStep(step + 1) }} disabled={busy || !form.sourceReady}>Next</Button>
            : <Button key="create" type="submit" variant="primary" loading={isLoading} disabled={busy || !form.sourceReady}>Create Draft</Button>}
        </Dialog.Footer>
      </form>
    </Dialog>
  )
}
