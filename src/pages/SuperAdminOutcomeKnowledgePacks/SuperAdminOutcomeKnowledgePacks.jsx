import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdInventory2 } from 'react-icons/md'
import { Accordion } from '../../components/Accordion'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import {
  useActivateOutcomeKnowledgePackVersionMutation,
  useCreateOutcomeKnowledgePackVersionMutation,
  useDeprecateOutcomeKnowledgePackVersionMutation,
  useDisableOutcomeKnowledgePackVersionMutation,
  useGetOutcomeKnowledgePackQuery,
  useGetOutcomeKnowledgePackVersionQuery,
  useImportOutcomeKnowledgePackSourceDocumentDraftMutation,
  useImportOutcomeKnowledgePackStarterVersionMutation,
  useLazyPreviewOutcomeKnowledgePackVersionContentQuery,
  useListOutcomeKnowledgePackManifestsQuery,
  usePreviewOutcomeKnowledgePackManifestResolutionQuery,
  usePreviewOutcomeKnowledgePackReasoningContextQuery,
  useListOutcomeKnowledgePacksQuery,
  usePreviewOutcomeKnowledgePackResolutionQuery,
  useRollbackOutcomeKnowledgePackMutation,
  useUpdateOutcomeKnowledgePackReviewMutation,
  useValidateOutcomeKnowledgePackVersionMutation,
} from '../../store/api/outcomeKnowledgePacksApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM,
  EMPTY_KNOWLEDGE_PACK_UPLOAD_FORM,
  KNOWLEDGE_PACK_EXECUTION_MODE_OPTIONS,
  KNOWLEDGE_PACK_PURPOSE_FILTER_OPTIONS,
  KNOWLEDGE_PACK_PURPOSE_CATEGORY_OPTIONS,
  KNOWLEDGE_PACK_REVIEW_STATUS_OPTIONS,
  KNOWLEDGE_PACK_VISIBILITY_FILTER_OPTIONS,
  KNOWLEDGE_PACK_VISIBILITY_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_PAGE_SIZE,
  OUTCOME_KNOWLEDGE_PACK_SOURCE_FORMAT_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_STATUS_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS,
  buildOutcomeKnowledgePackRows,
  canApproveKnowledgePackReview,
  canActivateKnowledgePack,
  canDeprecateKnowledgePack,
  canDisableKnowledgePack,
  canImportKnowledgePackStarter,
  canRejectKnowledgePackReview,
  canRollbackKnowledgePackVersion,
  canSubmitKnowledgePackForReview,
  canUploadKnowledgePack,
  canValidateKnowledgePack,
  filterOutcomeKnowledgePackRows,
  formatKnowledgePackStatus,
  formatKnowledgePackType,
  getKnowledgePackStatusVariant,
  getActivateKnowledgePackDisabledReason,
  getRuntimeBindingLabel,
  getRuntimeBindingVariant,
  getValidateKnowledgePackDisabledReason,
  hasKnowledgePackVersion,
  isImportedSourceDocument,
  isStarterSourceKnowledgePack,
} from './superAdminOutcomeKnowledgePacks.constants.js'
import './SuperAdminOutcomeKnowledgePacks.css'

const GLOBAL_SCOPE_COPY =
  'This action activates the version at GLOBAL scope only. Outcome Studio remains blocked until every required pack is active.'

const BINARY_SOURCE_PREVIEW_FORMATS = new Set(['DOCX', 'PDF'])

const EMPTY_CONTENT_PREVIEW_STATE = Object.freeze({
  key: '',
  data: null,
  error: null,
  isLoading: false,
})

function InlineLoadingState({ label }) {
  return (
    <div className="super-admin-outcome-knowledge-packs__loading" role="status">
      <Spinner size="sm" aria-label={label} />
      <span>{label}</span>
    </div>
  )
}

const LIFECYCLE_ACTION_CONFIG = Object.freeze({
  deprecate: Object.freeze({
    title: 'Deprecate pack version?',
    confirmLabel: 'Deprecate',
    toastTitle: 'Deprecated',
    failureTitle: 'Deprecation failed',
    variant: 'warning',
    copy: 'Deprecating this version removes it from active registry resolution while preserving its audit history.',
  }),
  disable: Object.freeze({
    title: 'Disable pack version?',
    confirmLabel: 'Disable',
    toastTitle: 'Disabled',
    failureTitle: 'Disable failed',
    variant: 'danger',
    copy: 'Disabling this version blocks it from new Outcome Studio pack resolution until another version is activated.',
  }),
  rollback: Object.freeze({
    title: 'Rollback to selected version?',
    confirmLabel: 'Rollback',
    toastTitle: 'Rollback complete',
    failureTitle: 'Rollback failed',
    variant: 'primary',
    copy: 'Rollback creates a new activation for the selected version and preserves historical session bindings.',
  }),
})

const REVIEW_STATUS_ACTION_CONFIG = Object.freeze({
  READY_FOR_REVIEW: Object.freeze({
    title: 'Submitted for review',
    failureTitle: 'Review submission failed',
    description: 'is ready for governed review.',
  }),
  APPROVED: Object.freeze({
    title: 'Review approved',
    failureTitle: 'Review approval failed',
    description: 'can now be activated.',
  }),
  REJECTED: Object.freeze({
    title: 'Review rejected',
    failureTitle: 'Review rejection failed',
    description: 'requires authoring changes before activation.',
  }),
})

function getPackActionId(row = {}) {
  return row.packId || row.packKey
}

function getVersionId(row = {}) {
  const safeRow = row || {}
  return safeRow.latestVersionId || safeRow.versionId
}

function canViewKnowledgePackDetail(row = {}) {
  return Boolean(row.isPersisted && row.packId)
}

function formatDetailValue(value, fallback = 'Not recorded') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function buildContentPreviewKey({ packId, versionId } = {}) {
  return `${formatDetailValue(packId, '')}:${formatDetailValue(versionId, '')}`
}

function normalizeDetailToken(value = '') {
  return String(value ?? '').trim().toUpperCase()
}

function getContentPreviewUnavailableReason(version = {}) {
  const contentFormat = normalizeDetailToken(version.contentFormat)
  if (
    isImportedSourceDocument(version)
    && BINARY_SOURCE_PREVIEW_FORMATS.has(contentFormat)
    && version.sourceMetadata?.contentPersisted !== true
  ) {
    return 'Source preview is unavailable because this binary draft does not have persisted extracted text. Reimport or backfill the source document to enable audited review.'
  }

  return ''
}

function getFilenameExtension(filename = '') {
  const normalized = String(filename ?? '').trim().toLowerCase()
  const extension = normalized.split('.').pop()
  return extension && extension !== normalized ? extension : ''
}

function inferSourceFormatFromFilename(filename = '') {
  const extension = getFilenameExtension(filename)
  if (extension === 'docx') return 'DOCX'
  if (extension === 'pdf') return 'PDF'
  if (extension === 'yaml' || extension === 'yml') return 'YAML'
  if (extension === 'json') return 'JSON'
  return 'MARKDOWN'
}

function shouldReadSourceText(filename = '') {
  const format = inferSourceFormatFromFilename(filename)
  return format === 'MARKDOWN' || format === 'YAML' || format === 'JSON'
}

function shouldReadSourceBinary(filename = '') {
  const format = inferSourceFormatFromFilename(filename)
  return format === 'DOCX' || format === 'PDF'
}

function bytesToBase64(bytes) {
  const chunkSize = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return globalThis.btoa(binary)
}

function readFileText(file) {
  if (!file) return Promise.resolve('')
  if (typeof file.text === 'function') return file.text()

  const FileReaderConstructor = globalThis.FileReader
  if (typeof FileReaderConstructor !== 'function') {
    return Promise.reject(new Error('File text reader is unavailable.'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReaderConstructor()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read source document.'))
    reader.readAsText(file)
  })
}

async function readFileBase64(file) {
  if (!file) return ''

  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    return bytesToBase64(bytes)
  }

  const FileReaderConstructor = globalThis.FileReader
  if (typeof FileReaderConstructor !== 'function') {
    throw new Error('File binary reader is unavailable.')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReaderConstructor()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      resolve(dataUrl.includes(',') ? dataUrl.split(',').pop() : dataUrl)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read source document.'))
    reader.readAsDataURL(file)
  })
}

function buildDraftPackKey(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getSummaryEntries(summary = {}) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return []

  return Object.entries(summary)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({
      key,
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]+/g, ' ')
        .trim(),
      value,
    }))
}

function formatSummaryValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value)
  return String(value)
}

function ValidationCheckList({ label, checks = [] }) {
  if (!Array.isArray(checks) || checks.length === 0) {
    return (
      <span className="super-admin-outcome-knowledge-packs__muted">
        No {label.toLowerCase()} recorded.
      </span>
    )
  }

  return (
    <ol className="super-admin-outcome-knowledge-packs__validation-checks">
      {checks.map((check, index) => {
        const key = check?.code || check?.message || `${label}-${index}`
        const status = formatDetailValue(check?.status, 'Not recorded')

        return (
          <li key={key}>
            <div className="super-admin-outcome-knowledge-packs__validation-check-header">
              <code className="super-admin-outcome-knowledge-packs__key">
                {formatDetailValue(check?.code, `Check ${index + 1}`)}
              </code>
              <Status size="sm" showIcon variant={getKnowledgePackStatusVariant(status)}>
                {formatKnowledgePackStatus(status)}
              </Status>
            </div>
            {check?.message ? (
              <p>{check.message}</p>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

function ValidationSummaryValue({ entry }) {
  if (Array.isArray(entry.value)) {
    return <ValidationCheckList label={entry.label} checks={entry.value} />
  }

  if (entry.value && typeof entry.value === 'object') {
    return (
      <pre className="super-admin-outcome-knowledge-packs__summary-code">
        {JSON.stringify(entry.value, null, 2)}
      </pre>
    )
  }

  return formatSummaryValue(entry.value)
}

function KnowledgePackRowActionsMenu({
  row,
  onDetails,
  onImportStarter,
  onUpload,
  onValidate,
  onReviewStatusChange,
  onActivate,
  onDeprecate,
  onDisable,
  disabled = false,
}) {
  const options = []

  if (canViewKnowledgePackDetail(row)) {
    options.push({ value: 'details', label: 'View Details' })
  }

  if (canImportKnowledgePackStarter(row)) {
    options.push({ value: 'import-starter', label: 'Import Starter Version' })
  }

  if (canUploadKnowledgePack(row)) {
    options.push({
      value: 'upload',
      label: hasKnowledgePackVersion(row) ? 'Upload New Version' : 'Upload Starter Version',
    })
  }

  const validateDisabledReason = getValidateKnowledgePackDisabledReason(row)
  if (canValidateKnowledgePack(row)) {
    options.push({
      value: 'validate',
      label: isImportedSourceDocument(row) ? 'Validate Draft' : 'Validate Version',
    })
  } else if (validateDisabledReason) {
    options.push({
      value: 'validate-blocked',
      label: validateDisabledReason,
      disabled: true,
    })
  }

  if (canSubmitKnowledgePackForReview(row)) {
    options.push({ value: 'submit-review', label: 'Submit for Review' })
  }

  if (canApproveKnowledgePackReview(row)) {
    options.push({ value: 'approve-review', label: 'Approve Review' })
  }

  if (canRejectKnowledgePackReview(row)) {
    options.push({ value: 'reject-review', label: 'Reject Review' })
  }

  const activateDisabledReason = getActivateKnowledgePackDisabledReason(row)
  if (canActivateKnowledgePack(row)) {
    options.push({ value: 'activate', label: 'Activate Version' })
  } else if (activateDisabledReason) {
    options.push({
      value: 'activate-blocked',
      label: activateDisabledReason,
      disabled: true,
    })
  }

  if (canDeprecateKnowledgePack(row)) {
    options.push({ value: 'deprecate', label: 'Deprecate Version' })
  }

  if (canDisableKnowledgePack(row)) {
    options.push({ value: 'disable', label: 'Disable Version' })
  }

  return (
    <div className="super-admin-outcome-knowledge-packs__row-actions">
      <Select
        size="sm"
        value=""
        placeholder={options.length > 0 ? 'Actions' : 'No actions'}
        options={options}
        disabled={disabled || options.length === 0}
        onChange={(event) => {
          if (event.target.value === 'details') onDetails(row)
          if (event.target.value === 'import-starter') onImportStarter(row)
          if (event.target.value === 'upload') onUpload(row)
          if (event.target.value === 'validate') onValidate(row)
          if (event.target.value === 'submit-review') {
            onReviewStatusChange(row, 'READY_FOR_REVIEW')
          }
          if (event.target.value === 'approve-review') {
            onReviewStatusChange(row, 'APPROVED')
          }
          if (event.target.value === 'reject-review') {
            onReviewStatusChange(row, 'REJECTED')
          }
          if (event.target.value === 'activate') onActivate(row)
          if (event.target.value === 'deprecate') onDeprecate(row)
          if (event.target.value === 'disable') onDisable(row)
        }}
        aria-label={`Actions for ${row.packKey}`}
      />
    </div>
  )
}

function DetailItem({ label, children }) {
  return (
    <div className="super-admin-outcome-knowledge-packs__detail-item">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function VersionSummary({
  version,
  isLoading,
  error,
  contentPreview,
  contentPreviewError,
  isContentPreviewLoading,
  onLoadContentPreview,
}) {
  if (error) {
    return (
      <p className="super-admin-outcome-knowledge-packs__error" role="alert">
        {error.message}
      </p>
    )
  }

  if (isLoading) {
    return <InlineLoadingState label="Loading version metadata..." />
  }

  if (!version) {
    return <p className="super-admin-outcome-knowledge-packs__muted">No version selected.</p>
  }

  const validationEntries = getSummaryEntries(version.validationSummary)
  const contentPreviewUnavailableReason = getContentPreviewUnavailableReason(version)

  return (
    <div className="super-admin-outcome-knowledge-packs__version-detail">
      <dl className="super-admin-outcome-knowledge-packs__detail-grid">
        <DetailItem label="Status">
          <Status size="sm" showIcon variant={getKnowledgePackStatusVariant(version.status)}>
            {formatKnowledgePackStatus(version.status)}
          </Status>
        </DetailItem>
        <DetailItem label="Review">
          {formatDetailValue(version.reviewStatus)}
        </DetailItem>
        <DetailItem label="Semantic version">
          {formatDetailValue(version.semanticVersion)}
        </DetailItem>
        <DetailItem label="Schema version">
          {formatDetailValue(version.schemaVersion)}
        </DetailItem>
        <DetailItem label="Scope">
          <code className="super-admin-outcome-knowledge-packs__key">
            {formatDetailValue(version.scopeKey)}
          </code>
        </DetailItem>
        <DetailItem label="Source">
          {version.sourceFilename ? (
            <code className="super-admin-outcome-knowledge-packs__key">
              {version.sourceFilename}
            </code>
          ) : (
            <span className="super-admin-outcome-knowledge-packs__muted">No source filename</span>
          )}
        </DetailItem>
        <DetailItem label="Content hash">
          <code className="super-admin-outcome-knowledge-packs__key">
            {formatDetailValue(version.contentHash)}
          </code>
        </DetailItem>
        <DetailItem label="Validated">
          <TableDateTime value={version.validatedAt} />
        </DetailItem>
        <DetailItem label="Updated">
          <TableDateTime value={version.updatedAt} />
        </DetailItem>
      </dl>

      <div className="super-admin-outcome-knowledge-packs__detail-panel">
        <h3>Validation Result</h3>
        {validationEntries.length > 0 ? (
          <dl className="super-admin-outcome-knowledge-packs__summary-list">
            {validationEntries.map((entry) => (
              <div key={entry.key}>
                <dt>{entry.label}</dt>
                <dd>
                  <ValidationSummaryValue entry={entry} />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="super-admin-outcome-knowledge-packs__muted">
            No validation summary recorded.
          </p>
        )}
      </div>

      <div className="super-admin-outcome-knowledge-packs__detail-panel">
        <div className="super-admin-outcome-knowledge-packs__panel-header">
          <div>
            <h3>Content Preview</h3>
            <p>
              Source text is fetched only from the audited Super Admin preview endpoint.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadContentPreview}
            loading={isContentPreviewLoading}
            disabled={isContentPreviewLoading || Boolean(contentPreviewUnavailableReason)}
          >
            Load Source Preview
          </Button>
        </div>

        {contentPreviewUnavailableReason ? (
          <p className="super-admin-outcome-knowledge-packs__muted">
            {contentPreviewUnavailableReason}
          </p>
        ) : null}

        {contentPreviewError ? (
          <p className="super-admin-outcome-knowledge-packs__error" role="alert">
            {contentPreviewError.message}
          </p>
        ) : null}

        {isContentPreviewLoading ? (
          <InlineLoadingState label="Loading audited source preview..." />
        ) : null}

        {contentPreview?.contentVisible ? (
          <div className="super-admin-outcome-knowledge-packs__content-preview">
            <div className="super-admin-outcome-knowledge-packs__content-preview-meta">
              <Badge variant="warning" size="sm" pill outline>
                Source visible
              </Badge>
              <code className="super-admin-outcome-knowledge-packs__key">
                {formatDetailValue(contentPreview.sourceFilename)}
              </code>
              <span>
                {Number(contentPreview.contentLength ?? 0).toLocaleString()} chars
              </span>
            </div>
            <pre className="super-admin-outcome-knowledge-packs__content-preview-code">
              {contentPreview.content}
            </pre>
          </div>
        ) : (
          !isContentPreviewLoading
            && !contentPreviewError
            && (
              <p className="super-admin-outcome-knowledge-packs__muted">
                Source content is hidden until preview is explicitly loaded.
              </p>
            )
        )}
      </div>
    </div>
  )
}

function ActivationHistory({ activations = [] }) {
  if (activations.length === 0) {
    return (
      <p className="super-admin-outcome-knowledge-packs__muted">
        No activation history recorded.
      </p>
    )
  }

  return (
    <ol className="super-admin-outcome-knowledge-packs__history-list">
      {activations.map((activation) => (
        <li key={activation.activationId || `${activation.versionId}:${activation.scopeKey}`}>
          <div className="super-admin-outcome-knowledge-packs__history-header">
            <Status size="sm" showIcon variant={activation.status === 'ACTIVE' ? 'success' : 'neutral'}>
              {formatKnowledgePackStatus(activation.status)}
            </Status>
            <span>{activation.semanticVersion || activation.versionId}</span>
          </div>
          <dl className="super-admin-outcome-knowledge-packs__history-meta">
            <DetailItem label="Scope">
              <code className="super-admin-outcome-knowledge-packs__key">
                {formatDetailValue(activation.scopeKey)}
              </code>
            </DetailItem>
            <DetailItem label="Activated">
              <TableDateTime value={activation.activatedAt} />
            </DetailItem>
            <DetailItem label="Content hash">
              <code className="super-admin-outcome-knowledge-packs__key">
                {formatDetailValue(activation.contentHash)}
              </code>
            </DetailItem>
          </dl>
        </li>
      ))}
    </ol>
  )
}

function KnowledgePackDetailDialog({
  pack,
  detail,
  detailError,
  isLoading,
  isFetching,
  selectedVersionId,
  selectedVersion,
  versionError,
  isVersionLoading,
  isLifecycleLoading,
  contentPreview,
  contentPreviewError,
  isContentPreviewLoading,
  onLoadContentPreview,
  onVersionChange,
  onRollbackVersion,
  onClose,
}) {
  const open = Boolean(pack)
  const versions = detail?.versions ?? []
  const activations = detail?.activations ?? []
  const detailPack = detail || pack || {}
  const canRollbackSelectedVersion = canRollbackKnowledgePackVersion({
    pack: detailPack,
    version: selectedVersion,
    activations,
  })

  return (
    <Dialog open={open} onClose={onClose} size="xl">
      <Dialog.Header>
        <h2>Pack details</h2>
        <p className="super-admin-outcome-knowledge-packs__dialog-copy">
          {detailPack.label || pack?.label || 'Outcome Studio knowledge pack'}
        </p>
      </Dialog.Header>
      <Dialog.Body className="super-admin-outcome-knowledge-packs__dialog-body">
        {detailError ? (
          <p className="super-admin-outcome-knowledge-packs__error" role="alert">
            {detailError.message}
          </p>
        ) : null}

        {isLoading ? (
          <InlineLoadingState label="Loading pack details..." />
        ) : (
          <>
            <dl className="super-admin-outcome-knowledge-packs__detail-grid">
              <DetailItem label="Registry status">
                <Status size="sm" showIcon variant={getKnowledgePackStatusVariant(detailPack.status)}>
                  {formatKnowledgePackStatus(detailPack.status)}
                </Status>
              </DetailItem>
              <DetailItem label="Type">
                {formatKnowledgePackType(detailPack.packType)}
              </DetailItem>
              <DetailItem label="Pack key">
                <code className="super-admin-outcome-knowledge-packs__key">
                  {formatDetailValue(detailPack.packKey)}
                </code>
              </DetailItem>
              <DetailItem label="Latest version">
                <code className="super-admin-outcome-knowledge-packs__key">
                  {formatDetailValue(detailPack.latestVersionId)}
                </code>
              </DetailItem>
              <DetailItem label="Updated">
                <TableDateTime value={detailPack.updatedAt} />
              </DetailItem>
              <DetailItem label="Source">
                <code className="super-admin-outcome-knowledge-packs__key">
                  {formatDetailValue(
                    detailPack.sourceMetadata?.sourceFilename
                      || detailPack.sourceMetadata?.sourceDocument?.filename
                      || detailPack.sourceFilename,
                    isImportedSourceDocument(detailPack) ? 'No source document' : 'No starter source',
                  )}
                </code>
              </DetailItem>
            </dl>

            {detailPack.description ? (
              <p className="super-admin-outcome-knowledge-packs__dialog-helper">
                {detailPack.description}
              </p>
            ) : null}

            <div className="super-admin-outcome-knowledge-packs__detail-layout">
              <section className="super-admin-outcome-knowledge-packs__detail-panel">
                <div className="super-admin-outcome-knowledge-packs__panel-header">
                  <div>
                    <h3>Version History</h3>
                    <p>Most recent 20 versions returned by the registry.</p>
                  </div>
                  {isFetching ? (
                    <Badge variant="neutral" size="sm" pill outline>
                      Refreshing
                    </Badge>
                  ) : null}
                </div>

                {versions.length > 0 ? (
                  <>
                    <Select
                      id="knowledge-pack-version-history"
                      label="Version"
                      size="sm"
                      value={selectedVersionId}
                      options={versions.map((version) => ({
                        value: version.versionId,
                        label: `${version.semanticVersion || version.versionId} - ${
                          formatKnowledgePackStatus(version.status)
                        }`,
                      }))}
                      onChange={(event) => onVersionChange(event.target.value)}
                    />
                    {selectedVersion ? (
                      <div className="super-admin-outcome-knowledge-packs__lifecycle-actions">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRollbackVersion(detailPack, selectedVersion)}
                          disabled={!canRollbackSelectedVersion || isLifecycleLoading}
                        >
                          Rollback Selected
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="super-admin-outcome-knowledge-packs__muted">
                    No versions recorded.
                  </p>
                )}

                <VersionSummary
                  version={selectedVersion}
                  isLoading={isVersionLoading}
                  error={versionError}
                  contentPreview={contentPreview}
                  contentPreviewError={contentPreviewError}
                  isContentPreviewLoading={isContentPreviewLoading}
                  onLoadContentPreview={onLoadContentPreview}
                />
              </section>

              <section className="super-admin-outcome-knowledge-packs__detail-panel">
                <div className="super-admin-outcome-knowledge-packs__panel-header">
                  <div>
                    <h3>Activation History</h3>
                    <p>Activation records are audit metadata only; rollback is not available in this UI.</p>
                  </div>
                </div>
                <ActivationHistory activations={activations} />
              </section>
            </div>
          </>
        )}
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

function renderPackSummary(_value, row) {
  return (
    <div className="super-admin-outcome-knowledge-packs__summary">
      <span className="super-admin-outcome-knowledge-packs__summary-name">{row.label}</span>
      <code className="super-admin-outcome-knowledge-packs__key">{row.packKey}</code>
      {row.description ? (
        <span className="super-admin-outcome-knowledge-packs__summary-description">
          {row.description}
        </span>
      ) : null}
    </div>
  )
}

function renderSource(_value, row) {
  if (row.sourceFilename) {
    return (
      <div className="super-admin-outcome-knowledge-packs__source">
        <Badge size="sm" variant={isStarterSourceKnowledgePack(row) ? 'warning' : 'info'} pill outline>
          {isStarterSourceKnowledgePack(row) ? 'Starter' : 'Source document'}
        </Badge>
        <code className="super-admin-outcome-knowledge-packs__key">{row.sourceFilename}</code>
      </div>
    )
  }

  return (
    <span className="super-admin-outcome-knowledge-packs__muted">
      {isImportedSourceDocument(row) ? 'No source document' : 'No starter source'}
    </span>
  )
}

function renderVersion(_value, row) {
  if (!hasKnowledgePackVersion(row)) {
    return <span className="super-admin-outcome-knowledge-packs__muted">No version</span>
  }

  return (
    <div className="super-admin-outcome-knowledge-packs__version">
      <span>{row.latestSemanticVersion || row.semanticVersion || 'Versioned'}</span>
      <code className="super-admin-outcome-knowledge-packs__key">{getVersionId(row)}</code>
    </div>
  )
}

function KnowledgePackSourceImportDialog({
  open,
  form,
  error,
  fieldErrors = {},
  isLoading,
  onClose,
  onSubmit,
  onFormChange,
  onFileMetadata,
  onFileReadError,
}) {
  if (!open) return null

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const filename = file.name
    const contentFormat = inferSourceFormatFromFilename(filename)
    const nextMetadata = {
      filename,
      contentType: file.type || '',
      fileExtension: getFilenameExtension(filename),
      contentFormat,
      extractedText: '',
      contentBase64: '',
      sizeBytes: file.size ?? '',
    }

    try {
      if (shouldReadSourceText(filename)) {
        nextMetadata.extractedText = await readFileText(file)
      }
      if (shouldReadSourceBinary(filename)) {
        nextMetadata.contentBase64 = await readFileBase64(file)
      }
    } catch (err) {
      event.target.value = ''
      onFileReadError?.(err)
      return
    }

    onFileMetadata(nextMetadata)
  }

  return (
    <Dialog open={open} onClose={onClose} size="xl">
      <form onSubmit={onSubmit} noValidate>
        <Dialog.Header>
          <h2>Import Source Document</h2>
          <p className="super-admin-outcome-knowledge-packs__dialog-copy">
            Create a draft Knowledge Pack from a governed source document reference.
          </p>
        </Dialog.Header>
        <Dialog.Body className="super-admin-outcome-knowledge-packs__dialog-body">
          {error ? (
            <p className="super-admin-outcome-knowledge-packs__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="super-admin-outcome-knowledge-packs__form-grid">
            <Select
              id="knowledge-pack-source-import-pack-type"
              label="Draft Pack Type"
              size="sm"
              value={form.packType}
              options={OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS.filter((option) => option.value)}
              onChange={(event) => onFormChange('packType', event.target.value)}
              error={fieldErrors.packType}
              required
            />
            <Input
              id="knowledge-pack-source-import-label"
              label="Name"
              size="sm"
              value={form.label}
              onChange={(event) => onFormChange('label', event.target.value)}
              error={fieldErrors.label}
              required
              fullWidth
            />
            <Select
              id="knowledge-pack-source-import-purpose-category"
              label="Purpose Category"
              size="sm"
              value={form.purposeCategory}
              options={KNOWLEDGE_PACK_PURPOSE_CATEGORY_OPTIONS}
              onChange={(event) => onFormChange('purposeCategory', event.target.value)}
              error={fieldErrors.purposeCategory}
            />
            <Select
              id="knowledge-pack-source-import-execution-mode"
              label="Execution Mode"
              size="sm"
              value={form.executionMode}
              options={KNOWLEDGE_PACK_EXECUTION_MODE_OPTIONS}
              onChange={(event) => onFormChange('executionMode', event.target.value)}
              error={fieldErrors.executionMode}
            />
            <Select
              id="knowledge-pack-source-import-visibility"
              label="Visibility"
              size="sm"
              value={form.visibility}
              options={KNOWLEDGE_PACK_VISIBILITY_OPTIONS}
              onChange={(event) => onFormChange('visibility', event.target.value)}
              error={fieldErrors.visibility}
            />
          </div>

          <Textarea
            id="knowledge-pack-source-import-description"
            label="Description"
            value={form.description}
            rows={3}
            resize="vertical"
            onChange={(event) => onFormChange('description', event.target.value)}
            error={fieldErrors.description}
            fullWidth
          />

          <label className="super-admin-outcome-knowledge-packs__file-field">
            <span>Source document file</span>
            <input
              type="file"
              accept=".md,.markdown,.txt,.yaml,.yml,.json,.docx,.pdf,text/plain,text/markdown,application/json,application/yaml,text/yaml,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
          {fieldErrors.filename ? (
            <p className="super-admin-outcome-knowledge-packs__field-error" role="alert">
              {fieldErrors.filename}
            </p>
          ) : null}

          <dl
            className="super-admin-outcome-knowledge-packs__derived-source"
            aria-label="Derived source metadata"
          >
            <DetailItem label="Filename">
              {formatDetailValue(form.filename, 'Select a source document')}
            </DetailItem>
            <DetailItem label="Format">
              {formatDetailValue(form.contentFormat, 'Derived from file')}
            </DetailItem>
            <DetailItem label="Document ID">
              Server generated
            </DetailItem>
            <DetailItem label="Source hash">
              Server generated
            </DetailItem>
          </dl>

          <Textarea
            id="knowledge-pack-source-import-extracted-text"
            label="Extracted text preview"
            value={form.extractedText}
            rows={8}
            resize="vertical"
            onChange={(event) => onFormChange('extractedText', event.target.value)}
            error={fieldErrors.extractedText}
            helperText="Auto-filled for Markdown, YAML, JSON, and text source documents. DOCX and PDF extraction runs on the server when the draft is created."
            readOnly
            fullWidth
          />

          <Accordion variant="outlined" className="super-admin-outcome-knowledge-packs__advanced">
            <Accordion.Item id="source-import-advanced">
              <Accordion.Header itemId="source-import-advanced">
                Advanced/system metadata
              </Accordion.Header>
              <Accordion.Content itemId="source-import-advanced">
                <div className="super-admin-outcome-knowledge-packs__form-grid">
                  <Input
                    id="knowledge-pack-source-import-pack-key"
                    label="Pack Key"
                    size="sm"
                    value={form.packKey}
                    onChange={(event) => onFormChange('packKey', event.target.value)}
                    error={fieldErrors.packKey}
                    required
                    fullWidth
                  />
                  <Input
                    id="knowledge-pack-source-import-semantic-version"
                    label="Semantic Version"
                    size="sm"
                    value={form.semanticVersion}
                    onChange={(event) => onFormChange('semanticVersion', event.target.value)}
                    error={fieldErrors.semanticVersion}
                    required
                    fullWidth
                  />
                  <Input
                    id="knowledge-pack-source-import-schema-version"
                    label="Schema Version"
                    size="sm"
                    value={form.schemaVersion}
                    onChange={(event) => onFormChange('schemaVersion', event.target.value)}
                    error={fieldErrors.schemaVersion}
                    required
                    fullWidth
                  />
                  <Select
                    id="knowledge-pack-source-import-content-format"
                    label="Source Format"
                    size="sm"
                    value={form.contentFormat}
                    options={OUTCOME_KNOWLEDGE_PACK_SOURCE_FORMAT_OPTIONS}
                    onChange={(event) => onFormChange('contentFormat', event.target.value)}
                    error={fieldErrors.contentFormat}
                    required
                  />
                  <Input
                    id="knowledge-pack-source-import-filename"
                    label="Source Filename"
                    size="sm"
                    value={form.filename}
                    onChange={(event) => onFormChange('filename', event.target.value)}
                    required
                    fullWidth
                  />
                  <Input
                    id="knowledge-pack-source-import-authority"
                    label="Source Authority"
                    size="sm"
                    value={form.sourceAuthority}
                    onChange={(event) => onFormChange('sourceAuthority', event.target.value)}
                    error={fieldErrors.sourceAuthority}
                    fullWidth
                  />
                  <Input
                    id="knowledge-pack-source-import-customer-id"
                    label="Customer Id"
                    size="sm"
                    value={form.customerId}
                    onChange={(event) => onFormChange('customerId', event.target.value)}
                    error={fieldErrors.customerId}
                    fullWidth
                  />
                  <Input
                    id="knowledge-pack-source-import-tenant-id"
                    label="Tenant Id"
                    size="sm"
                    value={form.tenantId}
                    onChange={(event) => onFormChange('tenantId', event.target.value)}
                    error={fieldErrors.tenantId}
                    fullWidth
                  />
                </div>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>

          <p className="super-admin-outcome-knowledge-packs__dialog-helper">
            Imported source documents are saved as draft packs. Validation and activation stay separate.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            Create Draft
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  )
}

function KnowledgePackUploadDialog({
  pack,
  form,
  error,
  fieldErrors = {},
  isLoading,
  onClose,
  onSubmit,
  onFormChange,
  onFileText,
  onFileReadError,
}) {
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    let content = ''
    try {
      content = await readFileText(file)
    } catch (err) {
      event.target.value = ''
      onFileReadError?.(err)
      return
    }
    onFileText({
      content,
      sourceFilename: pack?.sourceFilename || file.name,
    })
  }

  return (
    <Dialog open={Boolean(pack)} onClose={onClose} size="lg">
      <form onSubmit={onSubmit} noValidate>
        <Dialog.Header>
          <h2>Upload starter pack version</h2>
          <p className="super-admin-outcome-knowledge-packs__dialog-copy">
            {pack?.label ? `${pack.label} accepts the known starter source only.` : ''}
          </p>
        </Dialog.Header>
        <Dialog.Body className="super-admin-outcome-knowledge-packs__dialog-body">
          {error ? (
            <p className="super-admin-outcome-knowledge-packs__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="super-admin-outcome-knowledge-packs__form-grid">
            <Input
              id="knowledge-pack-semantic-version"
              label="Semantic Version"
              size="sm"
              value={form.semanticVersion}
              onChange={(event) => onFormChange('semanticVersion', event.target.value)}
              error={fieldErrors.semanticVersion}
              required
              fullWidth
            />
            <Input
              id="knowledge-pack-schema-version"
              label="Schema Version"
              size="sm"
              value={form.schemaVersion}
              onChange={(event) => onFormChange('schemaVersion', event.target.value)}
              error={fieldErrors.schemaVersion}
              required
              fullWidth
            />
            <Input
              id="knowledge-pack-source-filename"
              label="Source Filename"
              size="sm"
              value={form.sourceFilename}
              onChange={(event) => onFormChange('sourceFilename', event.target.value)}
              error={fieldErrors.sourceFilename}
              required
              fullWidth
            />
          </div>

          <label className="super-admin-outcome-knowledge-packs__file-field">
            <span>Starter source file</span>
            <input
              type="file"
              accept=".yaml,.yml,text/yaml,text/plain"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>

          <Textarea
            id="knowledge-pack-content"
            label="Source Content"
            value={form.content}
            rows={12}
            resize="vertical"
            onChange={(event) => onFormChange('content', event.target.value)}
            error={fieldErrors.content}
            helperText="Paste the YAML starter pack content if a file is not selected."
            required
            fullWidth
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            Create Version
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  )
}

function KnowledgePackBlankDraftDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2>Create Blank Pack</h2>
        <p>
          This authoring route needs a draft persistence contract before it can save.
        </p>
      </Dialog.Header>
      <Dialog.Body className="super-admin-outcome-knowledge-packs__dialog-body">
        <p className="super-admin-outcome-knowledge-packs__dialog-copy">
          Use Import Source Document for governed draft creation in this release.
        </p>
        <div className="super-admin-outcome-knowledge-packs__disabled-panel" role="note">
          <strong>Blocked</strong>
          <span>
            Blank-pack draft persistence, review workflow, and audit logging are not available yet.
          </span>
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="primary" onClick={onClose}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

function formatManifestStatus(value = '') {
  return formatKnowledgePackStatus(value)
}

function ManifestPackCount({ label, count }) {
  return (
    <span className="super-admin-outcome-knowledge-packs__manifest-count">
      <strong>{count}</strong>
      {label}
    </span>
  )
}

function KnowledgePackReasoningContextPreview({
  preview,
  error,
  isLoading,
}) {
  if (isLoading) {
    return <InlineLoadingState label="Loading reasoning context preview..." />
  }

  if (error) {
    return (
      <div className="super-admin-outcome-knowledge-packs__reasoning-preview-error" role="alert">
        {error.message}
      </div>
    )
  }

  const context = preview?.context ?? {}
  const resolution = context.resolution ?? {}
  const selectedContextPacks = Array.isArray(context.selectedContextPacks)
    ? context.selectedContextPacks
    : []
  const safeguards = Array.isArray(preview?.safeguards) ? preview.safeguards : []

  return (
    <section className="super-admin-outcome-knowledge-packs__reasoning-preview" aria-label="Reasoning context preview">
      <div className="super-admin-outcome-knowledge-packs__reasoning-preview-header">
        <div>
          <h4>Reasoning Context Preview</h4>
          <p>Metadata-only assembly. No provider execution or generated output.</p>
        </div>
        <Status size="sm" showIcon variant={getKnowledgePackStatusVariant(preview?.status || 'PROJECTED')}>
          {formatManifestStatus(preview?.status || 'PROJECTED')}
        </Status>
      </div>
      <div className="super-admin-outcome-knowledge-packs__manifest-metrics">
        <ManifestPackCount label="base" count={Number(resolution.basePackCount ?? 0)} />
        <ManifestPackCount label="context" count={Number(resolution.selectedContextPackCount ?? 0)} />
        <ManifestPackCount label="validation" count={Number(resolution.validationPackCount ?? 0)} />
        <ManifestPackCount label="omitted" count={Number(resolution.omittedOptionalPackCount ?? 0)} />
      </div>
      {selectedContextPacks.length > 0 ? (
        <ul className="super-admin-outcome-knowledge-packs__reasoning-pack-list">
          {selectedContextPacks.slice(0, 6).map((pack) => (
            <li key={`${pack.packType}:${pack.packKey}`}>
              <strong>{pack.purposeCategory || pack.packType}</strong>
              <span>{pack.label || pack.packKey}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="super-admin-outcome-knowledge-packs__table-note">
          No optional context packs are selected for this manifest preview.
        </p>
      )}
      {safeguards.length > 0 ? (
        <p className="super-admin-outcome-knowledge-packs__table-note">
          Safeguards: {safeguards.join(', ')}
        </p>
      ) : null}
    </section>
  )
}

function KnowledgePackManifestPreview({
  manifest,
  preview,
  error,
  isLoading,
  reasoningPreview,
  reasoningError,
  isReasoningLoading,
}) {
  if (!manifest) {
    return (
      <div className="super-admin-outcome-knowledge-packs__empty-panel">
        Select a manifest to preview dependency resolution.
      </div>
    )
  }

  if (error) {
    return (
      <div className="super-admin-outcome-knowledge-packs__error-panel" role="alert">
        {error.message}
      </div>
    )
  }

  if (isLoading) {
    return <InlineLoadingState label="Loading manifest preview..." />
  }

  const binding = preview?.binding ?? {}
  const resolution = binding.resolution ?? {}

  return (
    <section className="super-admin-outcome-knowledge-packs__manifest-preview" aria-label="Manifest resolution preview">
      <div className="super-admin-outcome-knowledge-packs__panel-header">
        <div>
          <h3>{manifest.manifestName || manifest.manifestKey}</h3>
          <p>{manifest.manifestKey} / v{manifest.semanticVersion}</p>
        </div>
        <Status size="sm" showIcon variant={getKnowledgePackStatusVariant(binding.status || manifest.status)}>
          {formatManifestStatus(binding.status || manifest.status)}
        </Status>
      </div>
      <div className="super-admin-outcome-knowledge-packs__manifest-metrics">
        <ManifestPackCount label="active" count={Number(resolution.activeCount ?? 0)} />
        <ManifestPackCount label="required" count={Number(resolution.requiredCount ?? 0)} />
        <ManifestPackCount label="validation" count={Number(resolution.validationCount ?? 0)} />
        <ManifestPackCount label="dependencies" count={Number(resolution.dependencyCount ?? 0)} />
      </div>
      <p className="super-admin-outcome-knowledge-packs__table-note">
        {binding.summary || 'Preview returns binding metadata only. Pack source content is not shown here.'}
      </p>
      <KnowledgePackReasoningContextPreview
        preview={reasoningPreview}
        error={reasoningError}
        isLoading={isReasoningLoading}
      />
    </section>
  )
}

function SuperAdminOutcomeKnowledgePacks() {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const [activeSurface, setActiveSurface] = useState('library')
  const [search, setSearch] = useState('')
  const [packType, setPackType] = useState('')
  const [status, setStatus] = useState('')
  const [purposeCategory, setPurposeCategory] = useState('')
  const [visibility, setVisibility] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [isBlankDraftOpen, setIsBlankDraftOpen] = useState(false)
  const [selectedManifestId, setSelectedManifestId] = useState('')
  const [isSourceImportOpen, setIsSourceImportOpen] = useState(false)
  const [sourceImportForm, setSourceImportForm] = useState(EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM)
  const [sourceImportError, setSourceImportError] = useState('')
  const [sourceImportFieldErrors, setSourceImportFieldErrors] = useState({})
  const [uploadPack, setUploadPack] = useState(null)
  const [uploadForm, setUploadForm] = useState(EMPTY_KNOWLEDGE_PACK_UPLOAD_FORM)
  const [uploadError, setUploadError] = useState('')
  const [uploadFieldErrors, setUploadFieldErrors] = useState({})
  const [pendingStarterImport, setPendingStarterImport] = useState(null)
  const [pendingActivation, setPendingActivation] = useState(null)
  const [pendingLifecycleAction, setPendingLifecycleAction] = useState(null)
  const [detailPack, setDetailPack] = useState(null)
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [contentPreviewState, setContentPreviewState] = useState(EMPTY_CONTENT_PREVIEW_STATE)

  const listQuery = useListOutcomeKnowledgePacksQuery({
    page: 1,
    pageSize: OUTCOME_KNOWLEDGE_PACK_PAGE_SIZE,
  })
  const manifestsQuery = useListOutcomeKnowledgePackManifestsQuery({
    page: 1,
    pageSize: OUTCOME_KNOWLEDGE_PACK_PAGE_SIZE,
  })
  const previewQuery = usePreviewOutcomeKnowledgePackResolutionQuery({})
  const manifestPreviewQuery = usePreviewOutcomeKnowledgePackManifestResolutionQuery(
    { manifestId: selectedManifestId },
    { skip: !selectedManifestId },
  )
  const detailPackId = detailPack?.packId || ''
  const detailQuery = useGetOutcomeKnowledgePackQuery(
    { packId: detailPackId },
    { skip: !detailPackId },
  )
  const [createVersion, { isLoading: isCreatingVersion }] =
    useCreateOutcomeKnowledgePackVersionMutation()
  const [importStarterVersion, { isLoading: isImportingStarterVersion }] =
    useImportOutcomeKnowledgePackStarterVersionMutation()
  const [importSourceDocumentDraft, { isLoading: isImportingSourceDocumentDraft }] =
    useImportOutcomeKnowledgePackSourceDocumentDraftMutation()
  const [validateVersion, { isLoading: isValidatingVersion }] =
    useValidateOutcomeKnowledgePackVersionMutation()
  const [updateReviewStatus, { isLoading: isUpdatingReviewStatus }] =
    useUpdateOutcomeKnowledgePackReviewMutation()
  const [activateVersion, { isLoading: isActivatingVersion }] =
    useActivateOutcomeKnowledgePackVersionMutation()
  const [deprecateVersion, { isLoading: isDeprecatingVersion }] =
    useDeprecateOutcomeKnowledgePackVersionMutation()
  const [disableVersion, { isLoading: isDisablingVersion }] =
    useDisableOutcomeKnowledgePackVersionMutation()
  const [rollbackPack, { isLoading: isRollingBackPack }] =
    useRollbackOutcomeKnowledgePackMutation()
  const [loadVersionContentPreview] =
    useLazyPreviewOutcomeKnowledgePackVersionContentQuery()

  const previewData = previewQuery.data?.data ?? {}
  const sourceBundle = previewData.sourceBundle ?? listQuery.data?.sourceBundle ?? {}
  const resolution = previewData.resolution ?? {}
  const rows = buildOutcomeKnowledgePackRows({
    registryPacks: listQuery.data?.data ?? [],
    requiredPacks: previewData.requiredPacks ?? [],
    starterPacks: sourceBundle.starterPacks ?? [],
  })
  const manifestRows = manifestsQuery.data?.data ?? []
  const selectedManifest = manifestRows.find((manifest) => manifest.manifestId === selectedManifestId)
    || manifestRows.find((manifest) => manifest.manifestKey === selectedManifestId)
    || null
  const reasoningContextPreviewQuery = usePreviewOutcomeKnowledgePackReasoningContextQuery(
    {
      manifestId: selectedManifestId,
      outputKey: selectedManifest?.outputKey || '',
    },
    { skip: !selectedManifestId },
  )
  const filteredRows = filterOutcomeKnowledgePackRows(rows, {
    search,
    packType,
    status,
    purposeCategory,
    visibility,
    reviewStatus,
  })
  const listError = listQuery.error ? normalizeError(listQuery.error) : null
  const manifestError = manifestsQuery.error ? normalizeError(manifestsQuery.error) : null
  const previewError = previewQuery.error ? normalizeError(previewQuery.error) : null
  const manifestPreviewError = manifestPreviewQuery.error
    ? normalizeError(manifestPreviewQuery.error)
    : null
  const reasoningContextPreviewError = reasoningContextPreviewQuery.error
    ? normalizeError(reasoningContextPreviewQuery.error)
    : null
  const isInitialLoading =
    (listQuery.isLoading || previewQuery.isLoading) && rows.length === 0
  const isManifestInitialLoading = manifestsQuery.isLoading && manifestRows.length === 0
  const isLifecycleMutating = isDeprecatingVersion || isDisablingVersion || isRollingBackPack
  const isMutating =
    isCreatingVersion
    || isImportingStarterVersion
    || isImportingSourceDocumentDraft
    || isValidatingVersion
    || isUpdatingReviewStatus
    || isActivatingVersion
    || isLifecycleMutating
  const detailData = detailQuery.data?.data ?? null
  const detailVersions = useMemo(() => detailData?.versions ?? [], [detailData?.versions])
  const effectiveSelectedVersionId = selectedVersionId || detailVersions[0]?.versionId || ''
  const versionQuery = useGetOutcomeKnowledgePackVersionQuery(
    { packId: detailPackId, versionId: effectiveSelectedVersionId },
    { skip: !detailPackId || !effectiveSelectedVersionId },
  )
  const selectedVersion = versionQuery.data?.data
    || detailVersions.find((version) => version.versionId === effectiveSelectedVersionId)
    || null
  const activeContentPreviewKey = buildContentPreviewKey({
    packId: detailPackId,
    versionId: effectiveSelectedVersionId,
  })
  const selectedContentPreviewState = contentPreviewState.key === activeContentPreviewKey
    ? contentPreviewState
    : EMPTY_CONTENT_PREVIEW_STATE
  const bindingStatus = previewData.status || 'BLOCKED'
  const activeCount = Number(resolution.activeCount ?? 0)
  const requiredCount = Number(resolution.requiredCount ?? rows.length)
  const unboundRequiredPacks = resolution.unboundRequiredPacks ?? rows
    .filter((row) => row.runtimeBindable !== true)
    .map((row) => ({ label: row.label, packKey: row.packKey, status: row.status }))

  const openSourceImportDialog = useCallback(() => {
    setIsSourceImportOpen(true)
    setSourceImportForm(EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM)
    setSourceImportError('')
    setSourceImportFieldErrors({})
  }, [])

  const closeSourceImportDialog = useCallback(() => {
    if (isImportingSourceDocumentDraft) return
    setIsSourceImportOpen(false)
    setSourceImportForm(EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM)
    setSourceImportError('')
    setSourceImportFieldErrors({})
  }, [isImportingSourceDocumentDraft])

  const updateSourceImportForm = useCallback((field, value) => {
    setSourceImportForm((current) => ({ ...current, [field]: value }))
    setSourceImportFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const handleSourceImportFileMetadata = useCallback((metadata = {}) => {
    setSourceImportForm((current) => ({
      ...current,
      ...metadata,
    }))
    setSourceImportFieldErrors((current) => {
      const next = { ...current }
      delete next.filename
      delete next.contentFormat
      delete next.extractedText
      return next
    })
  }, [])

  const handleSourceImportFileReadError = useCallback((err) => {
    const appError = normalizeError(err)
    setSourceImportFieldErrors((current) => ({
      ...current,
      filename: 'Unable to read selected source document.',
    }))
    setSourceImportError(appError.message)
    addToast({
      variant: 'error',
      title: 'Source file read failed',
      description: appError.message,
    })
  }, [addToast])

  const openUploadDialog = useCallback((row) => {
    setUploadPack(row)
    setUploadForm({
      ...EMPTY_KNOWLEDGE_PACK_UPLOAD_FORM,
      sourceFilename: row.sourceFilename || '',
    })
    setUploadError('')
    setUploadFieldErrors({})
  }, [])

  const openDetailDialog = useCallback((row) => {
    setDetailPack(row)
    setSelectedVersionId(getVersionId(row) || '')
    setContentPreviewState(EMPTY_CONTENT_PREVIEW_STATE)
  }, [])

  const closeDetailDialog = useCallback(() => {
    setDetailPack(null)
    setSelectedVersionId('')
    setContentPreviewState(EMPTY_CONTENT_PREVIEW_STATE)
  }, [])

  const handleVersionChange = useCallback((versionId) => {
    setSelectedVersionId(versionId)
    setContentPreviewState(EMPTY_CONTENT_PREVIEW_STATE)
  }, [])

  const closeUploadDialog = useCallback(() => {
    if (isCreatingVersion) return
    setUploadPack(null)
    setUploadForm(EMPTY_KNOWLEDGE_PACK_UPLOAD_FORM)
    setUploadError('')
    setUploadFieldErrors({})
  }, [isCreatingVersion])

  const openStarterImportDialog = useCallback((row) => {
    setPendingStarterImport(row)
  }, [])

  const closeStarterImportDialog = useCallback(() => {
    if (isImportingStarterVersion) return
    setPendingStarterImport(null)
  }, [isImportingStarterVersion])

  const openLifecycleAction = useCallback((action, row, version = null) => {
    setPendingLifecycleAction({
      action,
      row,
      version,
      versionId: version?.versionId || getVersionId(row),
      semanticVersion: version?.semanticVersion || row?.latestSemanticVersion || row?.semanticVersion || '',
    })
  }, [])

  const closeLifecycleAction = useCallback(() => {
    if (isLifecycleMutating) return
    setPendingLifecycleAction(null)
  }, [isLifecycleMutating])

  const updateUploadForm = useCallback((field, value) => {
    setUploadForm((current) => ({ ...current, [field]: value }))
    setUploadFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const handleUploadFileText = useCallback(({ content, sourceFilename }) => {
    setUploadForm((current) => ({
      ...current,
      content,
      sourceFilename,
    }))
    setUploadFieldErrors((current) => {
      const next = { ...current }
      delete next.content
      delete next.sourceFilename
      return next
    })
  }, [])

  const handleUploadFileReadError = useCallback((err) => {
    const appError = normalizeError(err)
    setUploadFieldErrors((current) => ({
      ...current,
      content: 'Unable to read selected source file.',
    }))
    setUploadError(appError.message)
    addToast({
      variant: 'error',
      title: 'Source file read failed',
      description: appError.message,
    })
  }, [addToast])

  const submitSourceImport = useCallback(async (event) => {
    event.preventDefault()

    const fieldErrors = {}
    const resolvedPackKey = sourceImportForm.packKey.trim()
      || buildDraftPackKey(sourceImportForm.label)

    if (!sourceImportForm.packType.trim()) {
      fieldErrors.packType = 'Pack type is required.'
    }
    if (!resolvedPackKey && sourceImportForm.label.trim()) {
      fieldErrors.packKey = 'Pack key is required.'
    }
    if (!sourceImportForm.label.trim()) {
      fieldErrors.label = 'Label is required.'
    }
    if (!sourceImportForm.semanticVersion.trim()) {
      fieldErrors.semanticVersion = 'Semantic version is required.'
    }
    if (!sourceImportForm.schemaVersion.trim()) {
      fieldErrors.schemaVersion = 'Schema version is required.'
    }
    if (!sourceImportForm.filename.trim()) {
      fieldErrors.filename = 'Source filename is required.'
    }
    const isBinarySourceImport = sourceImportForm.contentFormat === 'DOCX'
      || sourceImportForm.contentFormat === 'PDF'
    if (!isBinarySourceImport && !sourceImportForm.extractedText.trim()) {
      fieldErrors.extractedText = 'Extracted text is required for text source imports.'
    }
    if (isBinarySourceImport && !sourceImportForm.contentBase64.trim()) {
      fieldErrors.filename = 'Select a readable DOCX or PDF source document.'
    }
    if (sourceImportForm.visibility === 'CUSTOMER' && !sourceImportForm.customerId.trim()) {
      fieldErrors.customerId = 'Customer Id is required for customer visibility.'
    }
    if (sourceImportForm.visibility === 'TENANT' && !sourceImportForm.tenantId.trim()) {
      fieldErrors.tenantId = 'Tenant Id is required for tenant visibility.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setSourceImportFieldErrors(fieldErrors)
      setSourceImportError('')
      return
    }

    try {
      const res = await importSourceDocumentDraft({
        packType: sourceImportForm.packType,
        packKey: resolvedPackKey,
        label: sourceImportForm.label,
        description: sourceImportForm.description,
        purposeCategory: sourceImportForm.purposeCategory,
        semanticVersion: sourceImportForm.semanticVersion,
        schemaVersion: sourceImportForm.schemaVersion,
        sourceAuthority: sourceImportForm.sourceAuthority,
        executionMode: sourceImportForm.executionMode,
        visibility: sourceImportForm.visibility,
        customerId: sourceImportForm.customerId,
        tenantId: sourceImportForm.tenantId,
        contentFormat: sourceImportForm.contentFormat,
        sourceDocument: {
          filename: sourceImportForm.filename,
          contentType: sourceImportForm.contentType,
          fileExtension: sourceImportForm.fileExtension,
          sizeBytes: sourceImportForm.sizeBytes,
          ...(isBinarySourceImport
            ? { contentBase64: sourceImportForm.contentBase64 }
            : {}),
        },
        extractedText: isBinarySourceImport ? undefined : sourceImportForm.extractedText,
      }).unwrap()

      addToast({
        variant: 'success',
        title: 'Draft imported',
        description: `${res?.data?.pack?.label ?? sourceImportForm.label} is ready for review.`,
      })
      setIsSourceImportOpen(false)
      setSourceImportForm(EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM)
      setSourceImportError('')
      setSourceImportFieldErrors({})
    } catch (err) {
      const appError = normalizeError(err)
      setSourceImportFieldErrors({})
      setSourceImportError(appError.message)
      addToast({ variant: 'error', title: 'Source import failed', description: appError.message })
    }
  }, [addToast, importSourceDocumentDraft, sourceImportForm])

  const submitUpload = useCallback(async (event) => {
    event.preventDefault()
    if (!uploadPack) return

    const fieldErrors = {}
    if (!uploadForm.semanticVersion.trim()) {
      fieldErrors.semanticVersion = 'Semantic version is required.'
    }
    if (!uploadForm.schemaVersion.trim()) {
      fieldErrors.schemaVersion = 'Schema version is required.'
    }
    if (!uploadForm.sourceFilename.trim()) {
      fieldErrors.sourceFilename = 'Source filename is required.'
    }
    if (uploadForm.content.trim().length < 40) {
      fieldErrors.content = 'Starter source content must be at least 40 characters.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setUploadFieldErrors(fieldErrors)
      setUploadError('')
      return
    }

    try {
      const res = await createVersion({
        packId: getPackActionId(uploadPack),
        semanticVersion: uploadForm.semanticVersion,
        schemaVersion: uploadForm.schemaVersion,
        sourceFilename: uploadForm.sourceFilename,
        content: uploadForm.content,
      }).unwrap()

      addToast({
        variant: 'success',
        title: 'Version created',
        description: `Created ${res?.data?.version?.semanticVersion ?? uploadForm.semanticVersion}.`,
      })
      setUploadPack(null)
      setUploadForm(EMPTY_KNOWLEDGE_PACK_UPLOAD_FORM)
      setUploadError('')
      setUploadFieldErrors({})
    } catch (err) {
      const appError = normalizeError(err)
      setUploadFieldErrors({})
      setUploadError(appError.message)
      addToast({ variant: 'error', title: 'Upload failed', description: appError.message })
    }
  }, [addToast, createVersion, uploadForm, uploadPack])

  const confirmStarterImport = useCallback(async () => {
    if (!pendingStarterImport) return

    try {
      const res = await importStarterVersion({
        packId: getPackActionId(pendingStarterImport),
      }).unwrap()
      const importedVersion = res?.data?.version?.semanticVersion
        || pendingStarterImport.latestSemanticVersion
        || '1.0.0'

      addToast({
        variant: 'success',
        title: 'Starter imported',
        description: `${pendingStarterImport.label} ${importedVersion} is validated and ready for activation.`,
      })
      setPendingStarterImport(null)
    } catch (err) {
      const appError = normalizeError(err)
      addToast({ variant: 'error', title: 'Starter import failed', description: appError.message })
    }
  }, [addToast, importStarterVersion, pendingStarterImport])

  const handleValidateVersion = useCallback(async (row) => {
    const versionId = getVersionId(row)
    if (!versionId) return

    try {
      await validateVersion({
        packId: getPackActionId(row),
        versionId,
      }).unwrap()

      addToast({
        variant: 'success',
        title: 'Validation complete',
        description: `${row.label} is ready for activation when validation passes.`,
      })
    } catch (err) {
      const appError = normalizeError(err)
      addToast({ variant: 'error', title: 'Validation failed', description: appError.message })
    }
  }, [addToast, validateVersion])

  const handleReviewStatusChange = useCallback(async (row, reviewStatus) => {
    const versionId = getVersionId(row)
    if (!versionId) return

    const config = REVIEW_STATUS_ACTION_CONFIG[reviewStatus]

    try {
      await updateReviewStatus({
        packId: getPackActionId(row),
        versionId,
        reviewStatus,
      }).unwrap()

      addToast({
        variant: 'success',
        title: config?.title || 'Review updated',
        description: `${row.label} ${config?.description || 'review status updated.'}`,
      })
    } catch (err) {
      const appError = normalizeError(err)
      addToast({
        variant: 'error',
        title: config?.failureTitle || 'Review update failed',
        description: appError.message,
      })
    }
  }, [addToast, updateReviewStatus])

  const handleLoadContentPreview = useCallback(async () => {
    if (!detailPackId || !effectiveSelectedVersionId) return

    const key = buildContentPreviewKey({
      packId: detailPackId,
      versionId: effectiveSelectedVersionId,
    })

    setContentPreviewState({
      key,
      data: null,
      error: null,
      isLoading: true,
    })

    try {
      const res = await loadVersionContentPreview({
        packId: detailPackId,
        versionId: effectiveSelectedVersionId,
      }).unwrap()

      setContentPreviewState({
        key,
        data: res?.data ?? null,
        error: null,
        isLoading: false,
      })
    } catch (err) {
      const appError = normalizeError(err)
      setContentPreviewState({
        key,
        data: null,
        error: appError,
        isLoading: false,
      })
      addToast({
        variant: 'error',
        title: 'Preview failed',
        description: appError.message,
      })
    }
  }, [
    addToast,
    detailPackId,
    effectiveSelectedVersionId,
    loadVersionContentPreview,
  ])

  const confirmActivation = useCallback(async () => {
    if (!pendingActivation) return

    try {
      await activateVersion({
        packId: getPackActionId(pendingActivation),
        versionId: getVersionId(pendingActivation),
        scopeType: 'GLOBAL',
      }).unwrap()

      addToast({
        variant: 'success',
        title: 'Activated',
        description: `${pendingActivation.label} activated at GLOBAL scope.`,
      })
      setPendingActivation(null)
    } catch (err) {
      const appError = normalizeError(err)
      addToast({ variant: 'error', title: 'Activation failed', description: appError.message })
    }
  }, [activateVersion, addToast, pendingActivation])

  const confirmLifecycleAction = useCallback(async () => {
    if (!pendingLifecycleAction) return

    const { action, row, versionId } = pendingLifecycleAction
    const config = LIFECYCLE_ACTION_CONFIG[action]
    const packId = getPackActionId(row)

    try {
      if (action === 'deprecate') {
        await deprecateVersion({ packId, versionId }).unwrap()
      } else if (action === 'disable') {
        await disableVersion({ packId, versionId }).unwrap()
      } else if (action === 'rollback') {
        await rollbackPack({
          packId,
          versionId,
          scopeType: 'GLOBAL',
          rollbackReason: `Rollback ${row?.label || row?.packKey || 'knowledge pack'} to ${
            pendingLifecycleAction.semanticVersion || versionId
          }`,
        }).unwrap()
      }

      addToast({
        variant: 'success',
        title: config.toastTitle,
        description: `${row?.label ?? 'Knowledge pack'} ${config.toastTitle.toLowerCase()}.`,
      })
      setPendingLifecycleAction(null)
    } catch (err) {
      const appError = normalizeError(err)
      addToast({ variant: 'error', title: config.failureTitle, description: appError.message })
    }
  }, [
    addToast,
    deprecateVersion,
    disableVersion,
    pendingLifecycleAction,
    rollbackPack,
  ])

  const columns = useMemo(
    () => [
      {
        key: 'label',
        label: 'Pack',
        mobileLabel: 'Pack',
        width: '280px',
        render: renderPackSummary,
      },
      {
        key: 'packType',
        label: 'Type',
        mobileLabel: 'Type',
        width: '176px',
        render: (value) => formatKnowledgePackType(value),
      },
      {
        key: 'status',
        label: 'Registry Status',
        mobileLabel: 'Registry Status',
        width: '150px',
        render: (value) => (
          <Status size="sm" showIcon variant={getKnowledgePackStatusVariant(value)}>
            {formatKnowledgePackStatus(value)}
          </Status>
        ),
      },
      {
        key: 'runtimeBinding',
        label: 'Runtime Binding',
        mobileLabel: 'Runtime Binding',
        width: '156px',
        render: (_value, row) => (
          <Status
            className="super-admin-outcome-knowledge-packs__runtime-binding-status"
            size="sm"
            showIcon
            variant={getRuntimeBindingVariant(row)}
          >
            {getRuntimeBindingLabel(row)}
          </Status>
        ),
      },
      {
        key: 'sourceFilename',
        label: 'Source',
        mobileLabel: 'Source',
        width: '220px',
        render: renderSource,
      },
      {
        key: 'latestVersionId',
        label: 'Version',
        mobileLabel: 'Version',
        width: '220px',
        render: renderVersion,
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        mobileLabel: 'Updated',
        width: '136px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'actions',
        label: 'Actions',
        mobileLabel: 'Actions',
        align: 'center',
        width: '164px',
        render: (_value, row) => (
          <KnowledgePackRowActionsMenu
            row={row}
            onDetails={openDetailDialog}
            onImportStarter={openStarterImportDialog}
            onUpload={openUploadDialog}
            onValidate={handleValidateVersion}
            onReviewStatusChange={handleReviewStatusChange}
            onActivate={setPendingActivation}
            onDeprecate={(row) => openLifecycleAction('deprecate', row)}
            onDisable={(row) => openLifecycleAction('disable', row)}
            disabled={isMutating}
          />
        ),
      },
    ],
    [
      handleValidateVersion,
      handleReviewStatusChange,
      isMutating,
      openDetailDialog,
      openLifecycleAction,
      openStarterImportDialog,
      openUploadDialog,
    ],
  )

  const manifestColumns = useMemo(
    () => [
      {
        key: 'manifestName',
        label: 'Manifest',
        mobileLabel: 'Manifest',
        render: (_value, row) => (
          <div className="super-admin-outcome-knowledge-packs__summary">
            <span className="super-admin-outcome-knowledge-packs__summary-name">
              {row.manifestName || row.manifestKey}
            </span>
            <code className="super-admin-outcome-knowledge-packs__key">{row.manifestKey}</code>
          </div>
        ),
      },
      {
        key: 'semanticVersion',
        label: 'Version',
        mobileLabel: 'Version',
        width: '112px',
        render: (value) => <code className="super-admin-outcome-knowledge-packs__key">{value}</code>,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '132px',
        render: (value) => (
          <Status size="sm" showIcon variant={getKnowledgePackStatusVariant(value)}>
            {formatManifestStatus(value)}
          </Status>
        ),
      },
      {
        key: 'packSections',
        label: 'Pack Sections',
        mobileLabel: 'Pack Sections',
        render: (_value, row) => (
          <div className="super-admin-outcome-knowledge-packs__manifest-counts">
            <ManifestPackCount label="required" count={row.mandatoryPacks?.length || 0} />
            <ManifestPackCount label="optional" count={row.optionalPacks?.length || 0} />
            <ManifestPackCount label="validation" count={row.validationPacks?.length || 0} />
            <ManifestPackCount label="blocked" count={row.blockedPacks?.length || 0} />
          </div>
        ),
      },
      {
        key: 'scopeKey',
        label: 'Scope',
        mobileLabel: 'Scope',
        render: (value, row) => (
          <div className="super-admin-outcome-knowledge-packs__summary">
            <span>{row.scopeType || 'GLOBAL'}</span>
            <code className="super-admin-outcome-knowledge-packs__key">{value || 'GLOBAL'}</code>
          </div>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        mobileLabel: 'Actions',
        align: 'center',
        width: '136px',
        render: (_value, row) => (
          <Button
            type="button"
            variant={selectedManifestId === row.manifestId ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedManifestId(row.manifestId)}
          >
            Preview
          </Button>
        ),
      },
    ],
    [selectedManifestId],
  )

  return (
    <section
      className="super-admin-outcome-knowledge-packs container"
      aria-label="Outcome Studio Knowledge Packs"
    >
      <header className="super-admin-outcome-knowledge-packs__header">
        <div>
          <h1 className="super-admin-outcome-knowledge-packs__title">Knowledge Packs</h1>
          <p className="super-admin-outcome-knowledge-packs__subtitle">
            Version and activate the starter packs used by Outcome Studio runtime resolution.
          </p>
        </div>
        <Badge
          variant={bindingStatus === 'PROJECTED' ? 'success' : 'danger'}
          size="sm"
          pill
          outline
          icon={<MdInventory2 aria-hidden="true" />}
        >
          {bindingStatus}
        </Badge>
      </header>

      <Card variant="elevated" className="super-admin-outcome-knowledge-packs__summary-card">
        <Card.Body className="super-admin-outcome-knowledge-packs__summary-card-body">
          <div>
            <p className="super-admin-outcome-knowledge-packs__summary-label">
              Runtime resolution
            </p>
            <h2 className="super-admin-outcome-knowledge-packs__summary-title">
              {activeCount} of {requiredCount} required packs active
            </h2>
            <p className="super-admin-outcome-knowledge-packs__summary-copy">
              {previewData.summary
                || 'Knowledge Pack Registry activation is required before Outcome Studio sessions can start.'}
            </p>
          </div>
          <div className="super-admin-outcome-knowledge-packs__missing-list" aria-label="Unbound required packs">
            {unboundRequiredPacks.length > 0 ? (
              unboundRequiredPacks.slice(0, 5).map((pack) => (
                <Badge key={`${pack.packType}:${pack.packKey}`} variant="warning" size="sm" pill outline>
                  {pack.label ?? pack.packKey}
                </Badge>
              ))
            ) : (
              <Badge variant="success" size="sm" pill outline>
                All packs active
              </Badge>
            )}
          </div>
        </Card.Body>
      </Card>

      <Fieldset className="super-admin-outcome-knowledge-packs__fieldset">
        <Fieldset.Legend className="sr-only">Knowledge Intelligence Library shell</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-outcome-knowledge-packs__card">
          <Card.Body className="super-admin-outcome-knowledge-packs__card-body">
            <div className="super-admin-outcome-knowledge-packs__catalogue-actions">
              <div className="super-admin-outcome-knowledge-packs__surface-tabs" role="tablist" aria-label="Knowledge library sections">
                <Button
                  type="button"
                  variant={activeSurface === 'library' ? 'primary' : 'outline'}
                  size="sm"
                  role="tab"
                  aria-selected={activeSurface === 'library'}
                  onClick={() => setActiveSurface('library')}
                >
                  Library
                </Button>
                <Button
                  type="button"
                  variant={activeSurface === 'manifests' ? 'primary' : 'outline'}
                  size="sm"
                  role="tab"
                  aria-selected={activeSurface === 'manifests'}
                  onClick={() => setActiveSurface('manifests')}
                >
                  Manifests
                </Button>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={openSourceImportDialog}
                disabled={isMutating}
              >
                Import Source Document
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBlankDraftOpen(true)}
                disabled={isMutating}
              >
                Create Blank Pack
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/super-admin/runtime-control')}
              >
                Back
              </Button>
            </div>

            {activeSurface === 'library' ? (
              <div role="tabpanel" aria-label="Knowledge Pack Library">
                <div className="super-admin-outcome-knowledge-packs__toolbar super-admin-outcome-knowledge-packs__toolbar--expanded">
                  <Input
                    id="outcome-knowledge-packs-search"
                    label="Search"
                    size="sm"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    fullWidth
                  />
                  <Select
                    id="outcome-knowledge-packs-type"
                    label="Pack Type"
                    size="sm"
                    value={packType}
                    options={OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS}
                    onChange={(event) => setPackType(event.target.value)}
                  />
                  <Select
                    id="outcome-knowledge-packs-status"
                    label="Status"
                    size="sm"
                    value={status}
                    options={OUTCOME_KNOWLEDGE_PACK_STATUS_OPTIONS}
                    onChange={(event) => setStatus(event.target.value)}
                  />
                  <Select
                    id="outcome-knowledge-packs-purpose"
                    label="Purpose"
                    size="sm"
                    value={purposeCategory}
                    options={KNOWLEDGE_PACK_PURPOSE_FILTER_OPTIONS}
                    onChange={(event) => setPurposeCategory(event.target.value)}
                  />
                  <Select
                    id="outcome-knowledge-packs-visibility"
                    label="Visibility"
                    size="sm"
                    value={visibility}
                    options={KNOWLEDGE_PACK_VISIBILITY_FILTER_OPTIONS}
                    onChange={(event) => setVisibility(event.target.value)}
                  />
                  <Select
                    id="outcome-knowledge-packs-review"
                    label="Review"
                    size="sm"
                    value={reviewStatus}
                    options={KNOWLEDGE_PACK_REVIEW_STATUS_OPTIONS}
                    onChange={(event) => setReviewStatus(event.target.value)}
                  />
                </div>

                {listError || previewError ? (
                  <p className="super-admin-outcome-knowledge-packs__error" role="alert">
                    {(listError || previewError).message}
                  </p>
                ) : null}

                <p className="super-admin-outcome-knowledge-packs__table-note">
                  Starter import and upload are source-only for all required Outcome Studio packs. Runtime activation remains a separate audited action.
                </p>

                <HorizontalScroll
                  className="super-admin-outcome-knowledge-packs__table-wrap"
                  ariaLabel="Outcome Studio knowledge pack table"
                  gap="sm"
                >
                  <Table
                    className="super-admin-outcome-knowledge-packs__table"
                    columns={columns}
                    data={filteredRows}
                    loading={isInitialLoading}
                    variant="striped"
                    hoverable
                    emptyMessage="No knowledge packs found."
                    ariaLabel="Outcome Studio knowledge packs"
                  />
                </HorizontalScroll>

                {(listQuery.isFetching || previewQuery.isFetching) && !isInitialLoading ? (
                  <InlineLoadingState label="Refreshing registry..." />
                ) : null}
              </div>
            ) : (
              <div className="super-admin-outcome-knowledge-packs__manifest-shell" role="tabpanel" aria-label="Knowledge Pack Manifests">
                {manifestError ? (
                  <p className="super-admin-outcome-knowledge-packs__error" role="alert">
                    {manifestError.message}
                  </p>
                ) : null}

                <div className="super-admin-outcome-knowledge-packs__manifest-grid">
                  <HorizontalScroll
                    className="super-admin-outcome-knowledge-packs__table-wrap"
                    ariaLabel="Knowledge Pack manifest table"
                    gap="sm"
                  >
                    <Table
                      className="super-admin-outcome-knowledge-packs__manifest-table"
                      columns={manifestColumns}
                      data={manifestRows}
                      loading={isManifestInitialLoading}
                      variant="striped"
                      hoverable
                      emptyMessage="No manifests found."
                      ariaLabel="Knowledge Pack manifests"
                    />
                  </HorizontalScroll>

                  <KnowledgePackManifestPreview
                    manifest={selectedManifest}
                    preview={manifestPreviewQuery.data?.data}
                    error={manifestPreviewError}
                    isLoading={manifestPreviewQuery.isLoading || manifestPreviewQuery.isFetching}
                    reasoningPreview={reasoningContextPreviewQuery.data?.data}
                    reasoningError={reasoningContextPreviewError}
                    isReasoningLoading={
                      reasoningContextPreviewQuery.isLoading || reasoningContextPreviewQuery.isFetching
                    }
                  />
                </div>

                {manifestsQuery.isFetching && !isManifestInitialLoading ? (
                  <InlineLoadingState label="Refreshing manifests..." />
                ) : null}
              </div>
            )}
          </Card.Body>
        </Card>
      </Fieldset>

      <KnowledgePackBlankDraftDialog
        open={isBlankDraftOpen}
        onClose={() => setIsBlankDraftOpen(false)}
      />

      <KnowledgePackSourceImportDialog
        open={isSourceImportOpen}
        form={sourceImportForm}
        error={sourceImportError}
        fieldErrors={sourceImportFieldErrors}
        isLoading={isImportingSourceDocumentDraft}
        onClose={closeSourceImportDialog}
        onSubmit={submitSourceImport}
        onFormChange={updateSourceImportForm}
        onFileMetadata={handleSourceImportFileMetadata}
        onFileReadError={handleSourceImportFileReadError}
      />

      <KnowledgePackUploadDialog
        pack={uploadPack}
        form={uploadForm}
        error={uploadError}
        fieldErrors={uploadFieldErrors}
        isLoading={isCreatingVersion}
        onClose={closeUploadDialog}
        onSubmit={submitUpload}
        onFormChange={updateUploadForm}
        onFileText={handleUploadFileText}
        onFileReadError={handleUploadFileReadError}
      />

      <KnowledgePackDetailDialog
        pack={detailPack}
        detail={detailData}
        detailError={detailQuery.error ? normalizeError(detailQuery.error) : null}
        isLoading={detailQuery.isLoading}
        isFetching={detailQuery.isFetching}
        selectedVersionId={effectiveSelectedVersionId}
        selectedVersion={selectedVersion}
        versionError={versionQuery.error ? normalizeError(versionQuery.error) : null}
        isVersionLoading={versionQuery.isLoading || versionQuery.isFetching}
        isLifecycleLoading={isLifecycleMutating}
        contentPreview={selectedContentPreviewState.data}
        contentPreviewError={selectedContentPreviewState.error}
        isContentPreviewLoading={selectedContentPreviewState.isLoading}
        onLoadContentPreview={handleLoadContentPreview}
        onVersionChange={handleVersionChange}
        onRollbackVersion={(pack, version) => openLifecycleAction('rollback', pack, version)}
        onClose={closeDetailDialog}
      />

      <Dialog
        open={Boolean(pendingStarterImport)}
        onClose={closeStarterImportDialog}
        size="sm"
      >
        <Dialog.Header>
          <h2>Import starter version?</h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-outcome-knowledge-packs__dialog-copy">
            Import {pendingStarterImport?.label ?? 'this starter pack'} from the governed OES-002 starter bundle.
          </p>
          <p className="super-admin-outcome-knowledge-packs__dialog-helper">
            This creates a validated starter version only. Runtime activation remains a separate audited action.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            type="button"
            variant="outline"
            onClick={closeStarterImportDialog}
            disabled={isImportingStarterVersion}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={confirmStarterImport}
            loading={isImportingStarterVersion}
          >
            Import Starter
          </Button>
        </Dialog.Footer>
      </Dialog>

      <Dialog
        open={Boolean(pendingActivation)}
        onClose={() => {
          if (!isActivatingVersion) setPendingActivation(null)
        }}
        size="sm"
      >
        <Dialog.Header>
          <h2>Activate pack version?</h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-outcome-knowledge-packs__dialog-copy">
            Activate {pendingActivation?.label ?? 'this pack'} version{' '}
            {getVersionId(pendingActivation) || 'latest'} for Outcome Studio resolution.
          </p>
          <p className="super-admin-outcome-knowledge-packs__dialog-helper">
            {GLOBAL_SCOPE_COPY}
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPendingActivation(null)}
            disabled={isActivatingVersion}
          >
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={confirmActivation} loading={isActivatingVersion}>
            Activate
          </Button>
        </Dialog.Footer>
      </Dialog>

      <Dialog
        open={Boolean(pendingLifecycleAction)}
        onClose={closeLifecycleAction}
        size="sm"
      >
        <Dialog.Header>
          <h2>{LIFECYCLE_ACTION_CONFIG[pendingLifecycleAction?.action]?.title}</h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-outcome-knowledge-packs__dialog-copy">
            {LIFECYCLE_ACTION_CONFIG[pendingLifecycleAction?.action]?.copy}
          </p>
          <p className="super-admin-outcome-knowledge-packs__dialog-helper">
            {pendingLifecycleAction?.row?.label ?? 'Knowledge pack'} version{' '}
            {pendingLifecycleAction?.semanticVersion || pendingLifecycleAction?.versionId || 'selected'} at GLOBAL scope.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            type="button"
            variant="outline"
            onClick={closeLifecycleAction}
            disabled={isLifecycleMutating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={LIFECYCLE_ACTION_CONFIG[pendingLifecycleAction?.action]?.variant || 'primary'}
            onClick={confirmLifecycleAction}
            loading={isLifecycleMutating}
          >
            {LIFECYCLE_ACTION_CONFIG[pendingLifecycleAction?.action]?.confirmLabel}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminOutcomeKnowledgePacks
