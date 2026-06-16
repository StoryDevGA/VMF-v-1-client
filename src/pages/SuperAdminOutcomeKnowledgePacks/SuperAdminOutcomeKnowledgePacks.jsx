import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdInventory2 } from 'react-icons/md'
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
  useImportOutcomeKnowledgePackStarterVersionMutation,
  useLazyPreviewOutcomeKnowledgePackVersionContentQuery,
  useListOutcomeKnowledgePacksQuery,
  usePreviewOutcomeKnowledgePackResolutionQuery,
  useRollbackOutcomeKnowledgePackMutation,
  useValidateOutcomeKnowledgePackVersionMutation,
} from '../../store/api/outcomeKnowledgePacksApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  EMPTY_KNOWLEDGE_PACK_UPLOAD_FORM,
  OUTCOME_KNOWLEDGE_PACK_PAGE_SIZE,
  OUTCOME_KNOWLEDGE_PACK_STATUS_OPTIONS,
  OUTCOME_KNOWLEDGE_PACK_TYPE_OPTIONS,
  buildOutcomeKnowledgePackRows,
  canActivateKnowledgePack,
  canDeprecateKnowledgePack,
  canDisableKnowledgePack,
  canImportKnowledgePackStarter,
  canRollbackKnowledgePackVersion,
  canUploadKnowledgePack,
  canValidateKnowledgePack,
  filterOutcomeKnowledgePackRows,
  formatKnowledgePackStatus,
  formatKnowledgePackType,
  getKnowledgePackStatusVariant,
  getRuntimeBindingLabel,
  getRuntimeBindingVariant,
  hasKnowledgePackVersion,
} from './superAdminOutcomeKnowledgePacks.constants.js'
import './SuperAdminOutcomeKnowledgePacks.css'

const GLOBAL_SCOPE_COPY =
  'This action activates the version at GLOBAL scope only. Outcome Studio remains blocked until every required pack is active.'

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

  if (canValidateKnowledgePack(row)) {
    options.push({ value: 'validate', label: 'Validate Version' })
  }

  if (canActivateKnowledgePack(row)) {
    options.push({ value: 'activate', label: 'Activate Version' })
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

  return (
    <div className="super-admin-outcome-knowledge-packs__version-detail">
      <dl className="super-admin-outcome-knowledge-packs__detail-grid">
        <DetailItem label="Status">
          <Status size="sm" showIcon variant={getKnowledgePackStatusVariant(version.status)}>
            {formatKnowledgePackStatus(version.status)}
          </Status>
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
            disabled={isContentPreviewLoading}
          >
            Load Source Preview
          </Button>
        </div>

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
                    detailPack.sourceMetadata?.sourceFilename || detailPack.sourceFilename,
                    'No starter source',
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
        <Badge size="sm" variant="warning" pill outline>
          Starter
        </Badge>
        <code className="super-admin-outcome-knowledge-packs__key">{row.sourceFilename}</code>
      </div>
    )
  }

  return (
    <span className="super-admin-outcome-knowledge-packs__muted">
      No starter source
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
}) {
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
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

function SuperAdminOutcomeKnowledgePacks() {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const [search, setSearch] = useState('')
  const [packType, setPackType] = useState('')
  const [status, setStatus] = useState('')
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
  const previewQuery = usePreviewOutcomeKnowledgePackResolutionQuery({})
  const detailPackId = detailPack?.packId || ''
  const detailQuery = useGetOutcomeKnowledgePackQuery(
    { packId: detailPackId },
    { skip: !detailPackId },
  )
  const [createVersion, { isLoading: isCreatingVersion }] =
    useCreateOutcomeKnowledgePackVersionMutation()
  const [importStarterVersion, { isLoading: isImportingStarterVersion }] =
    useImportOutcomeKnowledgePackStarterVersionMutation()
  const [validateVersion, { isLoading: isValidatingVersion }] =
    useValidateOutcomeKnowledgePackVersionMutation()
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
  const filteredRows = filterOutcomeKnowledgePackRows(rows, { search, packType, status })
  const listError = listQuery.error ? normalizeError(listQuery.error) : null
  const previewError = previewQuery.error ? normalizeError(previewQuery.error) : null
  const isInitialLoading =
    (listQuery.isLoading || previewQuery.isLoading) && rows.length === 0
  const isLifecycleMutating = isDeprecatingVersion || isDisablingVersion || isRollingBackPack
  const isMutating =
    isCreatingVersion
    || isImportingStarterVersion
    || isValidatingVersion
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
          <Status size="sm" showIcon variant={getRuntimeBindingVariant(row)}>
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
      isMutating,
      openDetailDialog,
      openLifecycleAction,
      openStarterImportDialog,
      openUploadDialog,
    ],
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
        <Fieldset.Legend className="sr-only">Outcome Studio knowledge pack registry</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-outcome-knowledge-packs__card">
          <Card.Body className="super-admin-outcome-knowledge-packs__card-body">
            <div className="super-admin-outcome-knowledge-packs__catalogue-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/super-admin/runtime-control')}
              >
                Back
              </Button>
            </div>

            <div className="super-admin-outcome-knowledge-packs__toolbar">
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
          </Card.Body>
        </Card>
      </Fieldset>

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
