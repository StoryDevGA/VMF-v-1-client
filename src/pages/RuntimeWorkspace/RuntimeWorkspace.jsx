import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  MdBolt,
  MdCompareArrows,
  MdInfoOutline,
  MdOutlineHistory,
  MdOutlineRoute,
  MdRefresh,
  MdSave,
  MdOutlineWarningAmber,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Input } from '../../components/Input'
import { Status } from '../../components/Status'
import { Textarea } from '../../components/Textarea'
import {
  useExecuteRuntimeActionMutation,
  useGetRuntimeRendererQuery,
  useMutateRuntimeStateMutation,
} from '../../store/api/runtimeInstanceApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  formatRuntimeTokenLabel,
  getExecutionStateVariant,
  getRuntimeExecutionState,
  getRuntimeInstanceDisplayId,
  getRuntimeLifecycleStatus,
  getRuntimeStatusVariant,
} from '../../utils/runtimeWorkspace.js'
import './RuntimeWorkspace.css'

const EMPTY_ARRAY = Object.freeze([])

const getRendererPayload = (response) => response?.data ?? null

const RENDERER_WARNING_SEVERITY_VARIANTS = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'danger',
  BLOCKER: 'danger',
})

const TOKEN_STATUS_VARIANTS = Object.freeze({
  BLOCKED: 'error',
  DRAFT: 'neutral',
  FAILED: 'error',
  IN_REVIEW: 'info',
  APPROVED: 'success',
  PUBLISHED: 'success',
  LOCKED: 'success',
  PASSED: 'success',
  READY: 'success',
  UNPUBLISHED: 'neutral',
  UNLOCKED: 'neutral',
  UNKNOWN: 'neutral',
  VALIDATED: 'success',
})

const normalizeRuntimeActionToken = (value) => String(value ?? '').trim().toUpperCase()

const SECTION_ACTION_KEYS = Object.freeze({
  GENERATE_SECTION: 'GENERATE_SECTION',
  REGENERATE_SECTION: 'REGENERATE_SECTION',
})

const SECTION_ACTION_KEY_SET = new Set(Object.values(SECTION_ACTION_KEYS))

const DISCOVERY_NAV_KEY = 'discovery'

const getRuntimeActionLabel = (action, fallback) =>
  action?.buttonLabel || action?.label || fallback

const getSectionActionDisabledReason = ({
  action,
  actionKey,
  editable,
  executingActionKey,
  generatedContent,
}) => {
  if (!action) return ''
  if (!action.enabled && action.disabledReason) return action.disabledReason
  if (!editable) return 'Current role or permissions do not allow runtime section generation.'
  if (executingActionKey) return 'Another runtime section action is already in progress.'
  if (actionKey === SECTION_ACTION_KEYS.REGENERATE_SECTION && !generatedContent) {
    return 'Generate this section before regenerating it.'
  }
  return ''
}

const getDefaultConfirmationMessage = (action) => {
  const label = String(action?.buttonLabel || action?.governedAction || action?.actionKey || 'this runtime action').trim()
  return `Confirm ${label}?`
}

const getTokenStatusVariant = (value, fallback = 'neutral') =>
  TOKEN_STATUS_VARIANTS[normalizeRuntimeActionToken(value)] ?? fallback

const getSummaryValueClassName = (variant = 'neutral') => [
  'runtime-workspace__summary-value',
  variant !== 'neutral' && `runtime-workspace__summary-value--${variant}`,
].filter(Boolean).join(' ')

const normalizeWarningSeverity = (value) => {
  const severity = String(value ?? '').trim().toUpperCase()
  if (severity === 'INFO' || severity === 'WARNING' || severity === 'ERROR' || severity === 'BLOCKER') {
    return severity
  }
  return 'WARNING'
}

const getWarningSeverityVariant = (severity) =>
  RENDERER_WARNING_SEVERITY_VARIANTS[normalizeWarningSeverity(severity)] ?? 'warning'

const isEmptyStructuredValue = (value) => {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.length === 0
  return Object.keys(value).length === 0
}

const hasRuntimeValue = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (isEmptyStructuredValue(value)) return false
  return true
}

const stringifyValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (isEmptyStructuredValue(value)) return ''
  return JSON.stringify(value, null, 2)
}

const stringifyGeneratedContent = (generated) => {
  if (!generated) return ''
  if (typeof generated.content === 'string') return generated.content
  return stringifyValue(generated.content ?? generated)
}

const stringifyAcceptedContent = (accepted) => {
  if (!accepted) return ''
  if (typeof accepted.content === 'string') return accepted.content
  return stringifyValue(accepted.content ?? accepted)
}

const getDiscoveryProjection = (renderer) =>
  renderer?.discovery ?? renderer?.evidencePack ?? renderer?.evidence_pack ?? null

const getDiscoveryState = (renderer) => {
  const discovery = getDiscoveryProjection(renderer)
  const explicitStatus = String(discovery?.state?.status ?? discovery?.status ?? '').trim()
  if (explicitStatus) return formatRuntimeTokenLabel(explicitStatus)
  if (hasRuntimeValue(discovery?.scopedViews) || hasRuntimeValue(discovery?.scoped_views)) return 'Evidence Ready'
  if (hasRuntimeValue(discovery)) return 'Input Captured'
  return 'Evidence Not Ready'
}

const getSectionNavigationStatus = (section) => {
  const stateStatus = String(section?.state?.status ?? '').trim()
  if (stateStatus) return formatRuntimeTokenLabel(stateStatus)
  const hasInput = hasRuntimeValue(section?.value)
  const hasGenerated = hasRuntimeValue(section?.generated?.content ?? section?.generated)
  return hasGenerated ? 'Generated' : hasInput ? 'Input Captured' : 'Input Required'
}

const getSectionPlaceholder = (section) => {
  const explicitPlaceholder = String(section?.placeholder ?? '').trim()
  const control = String(section?.control ?? 'TEXT').trim().toUpperCase()
  const dataType = String(section?.dataType ?? '').trim().toUpperCase()
  const label = String(section?.label ?? section?.key ?? 'this section')
    .replace(/^Section\s+/i, '')
    .trim()
    .toLowerCase()
    || 'this section'
  const isStructuredField = control === 'JSON' || dataType === 'OBJECT' || dataType === 'ARRAY'
  const isGenericPlaceholder = /^enter\s+.+\.\.\.$/i.test(explicitPlaceholder)

  if (explicitPlaceholder && (!isStructuredField || !isGenericPlaceholder)) return explicitPlaceholder

  if (dataType === 'ARRAY') {
    return 'Add one relevant point per line for this section.'
  }

  if (control === 'JSON' || dataType === 'OBJECT') {
    if (label === 'executive summary') {
      return 'Summarise the customer situation, priority, and recommended value narrative focus.'
    }

    return `Add a concise ${label} note for this value narrative.`
  }

  return `Add ${label} details here.`
}

const stringifyDraftValue = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && typeof value.summary === 'string') {
      return value.summary
    }
  }

  return stringifyValue(value)
}

const parseDraftValue = (section, draftValue) => {
  const control = String(section?.control ?? 'TEXT').trim().toUpperCase()
  const dataType = String(section?.dataType ?? '').trim().toUpperCase()
  const textValue = String(draftValue ?? '')

  if (control === 'CHECKBOX' || dataType === 'BOOLEAN') {
    return textValue === 'true'
  }

  if (control === 'NUMBER' || dataType === 'NUMBER') {
    const normalizedValue = textValue.trim()
    if (!normalizedValue) return null
    const numericValue = Number(normalizedValue)
    if (!Number.isFinite(numericValue)) {
      throw new Error('Enter a valid number before saving.')
    }
    return numericValue
  }

  if (control === 'JSON' || dataType === 'OBJECT' || dataType === 'ARRAY') {
    const normalizedValue = textValue.trim()
    if (!normalizedValue) return null
    try {
      return JSON.parse(normalizedValue)
    } catch {
      if (normalizedValue.startsWith('{') || normalizedValue.startsWith('[')) {
        throw new Error('Enter valid JSON before saving.')
      }

      if (dataType === 'ARRAY') {
        return normalizedValue
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      }

      return { summary: normalizedValue }
    }
  }

  return textValue
}

const getSectionValidationError = (section) => {
  const message = (Array.isArray(section?.validationMessages) ? section.validationMessages : [])
    .find((item) => String(item?.severity ?? '').toUpperCase() === 'ERROR')
  return message?.message ?? ''
}

const getSectionHelperText = (section) => {
  const validationMessages = Array.isArray(section?.validationMessages)
    ? section.validationMessages
    : []
  if (validationMessages.length > 0) {
    return validationMessages.map((message) => message.message).filter(Boolean).join(' ')
  }
  return section?.helpText ?? ''
}

const getAllowedValueLabel = (section, value) => {
  const labels = section?.allowedValueLabels ?? {}
  return labels?.[value] ?? value
}

const getSectionControlId = (section) => {
  const rawId = String(section?.key ?? section?.runtimePath ?? 'runtime-field')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `runtime-field-${rawId || 'section'}`
}

const getSectionDomId = (section, index = 0) => {
  const rawId = String(section?.key ?? section?.sectionKey ?? `section-${index + 1}`)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `runtime-section-${rawId || index + 1}`
}

function RuntimeSummaryTile({
  label,
  value,
  variant = 'neutral',
}) {
  return (
    <li className="runtime-workspace__summary-card">
      <span className="runtime-workspace__summary-label">{label}</span>
      <strong className={getSummaryValueClassName(variant)}>{value}</strong>
    </li>
  )
}

function RuntimeValueControl({
  disabled = false,
  editable = false,
  onChange,
  section,
  value,
}) {
  const control = String(section?.control ?? 'TEXT').trim().toUpperCase()
  const label = section?.label ?? section?.key ?? 'Runtime field'
  const error = getSectionValidationError(section)
  const helperText = getSectionHelperText(section)
  const isReadOnly = !editable || disabled
  const commonProps = {
    id: getSectionControlId(section),
    label,
    value,
    placeholder: getSectionPlaceholder(section),
    required: Boolean(section?.required),
    error,
    helperText,
    fullWidth: true,
    readOnly: isReadOnly,
    onChange,
  }

  if (control === 'TEXTAREA') {
    return (
      <Textarea
        {...commonProps}
        rows={5}
        resize="vertical"
      />
    )
  }

  if (control === 'NUMBER') {
    return (
      <Input
        {...commonProps}
        type="number"
      />
    )
  }

  if (control === 'CHECKBOX') {
    return (
      <label className="runtime-workspace__checkbox">
        <input
          type="checkbox"
          checked={value === 'true'}
          disabled={isReadOnly}
          onChange={(event) => onChange?.({ target: { value: String(event.target.checked) } })}
          aria-label={label}
        />
        <span>{label}</span>
      </label>
    )
  }

  if (control === 'SELECT') {
    const allowedValues = Array.isArray(section?.allowedValues) ? section.allowedValues : []
    return (
      <label className="runtime-workspace__select-field">
        <span>{label}</span>
        <select value={value} disabled={isReadOnly} onChange={onChange}>
          <option value="">{section?.placeholder || 'Select value'}</option>
          {allowedValues.map((allowedValue) => (
            <option key={allowedValue} value={allowedValue}>
              {getAllowedValueLabel(section, allowedValue)}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (control === 'JSON') {
    return (
      <label className="runtime-workspace__json-field">
        <span>{label}</span>
        <textarea
          value={value}
          placeholder={commonProps.placeholder}
          readOnly={isReadOnly}
          rows={6}
          onChange={onChange}
          aria-label={label}
        />
      </label>
    )
  }

  return (
    <Input
      {...commonProps}
      type="text"
    />
  )
}

function RuntimeSection({
  disabled = false,
  executingActionKey = '',
  feedback = null,
  generationActions = {},
  id,
  onExecuteSectionAction,
  onSave,
  onSaveAndNext,
  section,
  showRuntimePath = false,
}) {
  const validationMessages = Array.isArray(section?.validationMessages)
    ? section.validationMessages
    : []
  const currentValue = stringifyDraftValue(section?.value)
  const [draftValue, setDraftValue] = useState(currentValue)
  const [localError, setLocalError] = useState('')
  const [showCompare, setShowCompare] = useState(false)
  const editable = Boolean(section?.editable)
  const isDirty = draftValue !== currentValue
  const isSaving = Boolean(disabled)
  const canSave = editable && isDirty && !isSaving
  const generatedContent = stringifyGeneratedContent(section?.generated)
  const acceptedContent = stringifyAcceptedContent(section?.accepted)
  const revisions = Array.isArray(section?.revisions) ? section.revisions : []
  const latestRevision = revisions.length > 0 ? revisions[revisions.length - 1] : null
  const previousGeneratedContent = stringifyGeneratedContent(latestRevision?.generated)
  const generateAction = generationActions[SECTION_ACTION_KEYS.GENERATE_SECTION] || null
  const regenerateAction = generationActions[SECTION_ACTION_KEYS.REGENERATE_SECTION] || null
  const generateLabel = getRuntimeActionLabel(generateAction, 'Generate')
  const regenerateLabel = getRuntimeActionLabel(regenerateAction, 'Regenerate')
  const generateDisabledReason = getSectionActionDisabledReason({
    action: generateAction,
    actionKey: SECTION_ACTION_KEYS.GENERATE_SECTION,
    editable,
    executingActionKey,
    generatedContent,
  })
  const regenerateDisabledReason = getSectionActionDisabledReason({
    action: regenerateAction,
    actionKey: SECTION_ACTION_KEYS.REGENERATE_SECTION,
    editable,
    executingActionKey,
    generatedContent,
  })
  const generateReasonId = `${section.key}-generate-section-reason`
  const regenerateReasonId = `${section.key}-regenerate-section-reason`
  const resolvedFeedback = localError
    ? { variant: 'error', message: localError }
    : feedback

  const handleChange = (event) => {
    setLocalError('')
    setDraftValue(event.target.value)
  }

  const parseCurrentDraftValue = () => {
    if (!canSave) return

    try {
      return parseDraftValue(section, draftValue)
    } catch (parseError) {
      setLocalError(parseError.message)
      return undefined
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const value = parseCurrentDraftValue()
    if (value === undefined) return

    await onSave?.({ section, value })
  }

  const handleSaveAndNext = async () => {
    const value = parseCurrentDraftValue()
    if (value === undefined) return

    await onSaveAndNext?.({ section, value })
  }

  return (
    <li id={id} className="runtime-workspace__section-item">
      <Card variant="default" className="runtime-workspace__section-card">
        <Card.Body className="runtime-workspace__section-body">
          <form className="runtime-workspace__section-form" onSubmit={handleSubmit}>
            <div className="runtime-workspace__section-heading">
              <div>
                <h2>{section.label}</h2>
                {showRuntimePath ? (
                  <p>{section.runtimePath}</p>
                ) : null}
              </div>
              <div className="runtime-workspace__section-badges">
                {section.required ? (
                  <Badge variant="warning" size="sm" pill outline>Required</Badge>
                ) : null}
                <Badge variant={editable ? 'success' : 'neutral'} size="sm" pill outline>
                  {editable ? 'Editable' : 'Read only preview'}
                </Badge>
              </div>
            </div>
            <div
              className="runtime-workspace__section-panels"
              role="region"
              aria-label="Section ownership zones"
            >
              <section className="runtime-workspace__section-panel" aria-label="Suggested from Discovery">
                <h3>Suggested From Discovery</h3>
                <p>No discovery evidence is projected for this section yet.</p>
              </section>
              <section className="runtime-workspace__section-panel" aria-label="Your Additional Context">
                <h3>Your Additional Context</h3>
                <RuntimeValueControl
                  section={section}
                  value={draftValue}
                  editable={editable}
                  disabled={isSaving}
                  onChange={handleChange}
                />
              </section>
              <section className="runtime-workspace__section-panel" aria-label="Generated Section">
                <h3>Generated Section</h3>
                <p>{generatedContent || 'Awaiting generation'}</p>
              </section>
              <section className="runtime-workspace__section-panel" aria-label="Accepted Final">
                <h3>Accepted / Final</h3>
                <p>
                  {acceptedContent || 'No accepted final truth has been projected for this section.'}
                </p>
              </section>
            </div>
            <div className="runtime-workspace__section-state-row" aria-label="Section state and review">
              <Status variant={getTokenStatusVariant(section?.state?.status)} size="sm" showIcon>
                {formatRuntimeTokenLabel(section?.state?.status || 'DRAFT')}
                {Number(section?.state?.revisionCount || 0) > 0
                  ? `, ${section.state.revisionCount} revision${section.state.revisionCount === 1 ? '' : 's'}`
                  : ''}
              </Status>
              <Status variant={getTokenStatusVariant(section?.review?.status)} size="sm" showIcon>
                {formatRuntimeTokenLabel(section?.review?.status || 'PENDING_REVIEW')}
              </Status>
            </div>
            {showCompare ? (
              <div
                className="runtime-workspace__compare"
                role="region"
                aria-label="Generated comparison"
              >
                <section>
                  <h3>Previous</h3>
                  <p>{previousGeneratedContent || 'No previous generated revision'}</p>
                </section>
                <section>
                  <h3>Current</h3>
                  <p>{generatedContent || 'Awaiting generation'}</p>
                </section>
              </div>
            ) : null}
            {resolvedFeedback ? (
              <Status
                variant={resolvedFeedback.variant}
                size="sm"
                showIcon
              >
                {resolvedFeedback.message}
              </Status>
            ) : null}
            <div className="runtime-workspace__section-actions">
              {generateAction ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(generateDisabledReason)}
                  loading={executingActionKey === SECTION_ACTION_KEYS.GENERATE_SECTION}
                  aria-describedby={generateDisabledReason ? generateReasonId : undefined}
                  leftIcon={<MdBolt aria-hidden="true" />}
                  onClick={() => onExecuteSectionAction?.({ action: generateAction, section })}
                >
                  {generateLabel}
                </Button>
              ) : null}
              {regenerateAction ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(regenerateDisabledReason)}
                  loading={executingActionKey === SECTION_ACTION_KEYS.REGENERATE_SECTION}
                  aria-describedby={regenerateDisabledReason ? regenerateReasonId : undefined}
                  leftIcon={<MdRefresh aria-hidden="true" />}
                  onClick={() => onExecuteSectionAction?.({ action: regenerateAction, section })}
                >
                  {regenerateLabel}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!generatedContent}
                leftIcon={<MdCompareArrows aria-hidden="true" />}
                onClick={() => setShowCompare((current) => !current)}
              >
                Compare
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!canSave}
                leftIcon={<MdSave aria-hidden="true" />}
              >
                {isSaving ? 'Saving' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!canSave}
                leftIcon={<MdSave aria-hidden="true" />}
                onClick={handleSaveAndNext}
              >
                Save & Next
              </Button>
            </div>
            {[
              { action: generateAction, id: generateReasonId, reason: generateDisabledReason },
              { action: regenerateAction, id: regenerateReasonId, reason: regenerateDisabledReason },
            ].map(({ action, id, reason }) => (
              action && reason ? (
                <p
                  key={id}
                  id={id}
                  className="runtime-workspace__action-disabled-reason"
                >
                  {reason}
                </p>
              ) : null
            ))}
            {validationMessages.length > 0 ? (
              <ul className="runtime-workspace__validation-list" aria-label={`${section.label} validation messages`}>
                {validationMessages.map((message, index) => (
                  <li key={`${message.validationKey ?? section.key}-${index}`}>
                    <Status
                      variant={String(message.severity ?? '').toUpperCase() === 'ERROR' ? 'error' : 'warning'}
                      size="sm"
                      showIcon
                    >
                      {message.message}
                    </Status>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>
        </Card.Body>
      </Card>
    </li>
  )
}

function RuntimeActionButton({
  action,
  disabled = false,
  executing = false,
  onExecute,
}) {
  const enabled = Boolean(action?.enabled)
  const disabledReason = String(action?.disabledReason ?? '').trim()
  const actionKey = normalizeRuntimeActionToken(action?.governedAction || action?.actionKey || 'runtime-action')
  const reasonId = disabledReason
    ? `runtime-action-disabled-${actionKey.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`
    : undefined

  return (
    <div className="runtime-workspace__action-item">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!enabled || disabled}
        loading={executing}
        aria-describedby={!enabled && disabledReason ? reasonId : undefined}
        onClick={() => onExecute?.(action)}
        leftIcon={<MdBolt aria-hidden="true" />}
      >
        {getRuntimeActionLabel(action, actionKey)}
      </Button>
      {!enabled && disabledReason ? (
        <p id={reasonId} className="runtime-workspace__action-disabled-reason">
          {disabledReason}
        </p>
      ) : null}
    </div>
  )
}

function RuntimeProgressSummary({
  configWarnings = EMPTY_ARRAY,
  sections = EMPTY_ARRAY,
}) {
  const requiredSections = sections.filter((section) => section?.required)
  const requiredCompleteCount = requiredSections.filter((section) => hasRuntimeValue(section?.value)).length
  const requiredTotal = requiredSections.length
  const generatedCount = sections.filter((section) => hasRuntimeValue(section?.generated?.content ?? section?.generated)).length
  const warningCounts = configWarnings.reduce((acc, warning) => {
    const severity = normalizeWarningSeverity(warning?.severity)
    acc[severity] = (acc[severity] || 0) + 1
    return acc
  }, {})
  const hasRequiredInput = requiredTotal > 0
  const requiredPercent = hasRequiredInput
    ? Math.round((requiredCompleteCount / requiredTotal) * 100)
    : 0
  const requiredPercentLabel = hasRequiredInput ? `${requiredPercent}%` : 'N/A'
  const completionLabel = hasRequiredInput
    ? `${requiredCompleteCount} of ${requiredTotal} required sections have input`
    : 'No required input to measure'
  const warningSummary = [
    warningCounts.BLOCKER ? `${warningCounts.BLOCKER} blocker${warningCounts.BLOCKER === 1 ? '' : 's'}` : '',
    warningCounts.ERROR ? `${warningCounts.ERROR} error${warningCounts.ERROR === 1 ? '' : 's'}` : '',
    warningCounts.WARNING ? `${warningCounts.WARNING} warning${warningCounts.WARNING === 1 ? '' : 's'}` : '',
    warningCounts.INFO ? `${warningCounts.INFO} info` : '',
  ].filter(Boolean).join(' / ') || 'No workspace warnings'

  return (
    <div className="runtime-workspace__progress-summary" aria-label="Execution progress summary">
      <div className="runtime-workspace__progress-row">
        <span>Required input</span>
        <strong>{requiredPercentLabel}</strong>
      </div>
      <progress
        className="runtime-workspace__progress-bar"
        max="100"
        value={requiredPercent}
        aria-label={completionLabel}
      />
      <ul className="runtime-workspace__metric-list" aria-label="Execution workspace metrics">
        <li>
          <span>Required</span>
          <strong>{hasRequiredInput ? `${requiredCompleteCount}/${requiredTotal}` : 'None'}</strong>
        </li>
        <li>
          <span>Generated</span>
          <strong>{generatedCount}/{sections.length}</strong>
        </li>
        <li>
          <span>Warnings</span>
          <strong>{warningSummary}</strong>
        </li>
      </ul>
    </div>
  )
}

function RuntimeSectionNavigation({
  activeKey = DISCOVERY_NAV_KEY,
  discoveryState = 'Evidence Not Ready',
  onSelectDiscovery,
  onSelectSection,
  sections = EMPTY_ARRAY,
}) {
  return (
    <nav className="runtime-workspace__section-nav" aria-label="Guided section navigation">
      <ol>
        <li>
          <button
            type="button"
            className={[
              'runtime-workspace__section-nav-button',
              activeKey === DISCOVERY_NAV_KEY && 'runtime-workspace__section-nav-button--active',
            ].filter(Boolean).join(' ')}
            aria-current={activeKey === DISCOVERY_NAV_KEY ? 'step' : undefined}
            onClick={onSelectDiscovery}
          >
            <span>0</span>
            <strong>Discovery</strong>
            <small>{discoveryState}</small>
          </button>
        </li>
        {sections.map((section, index) => {
          const label = section?.shortLabel || section?.label || section?.sectionKey || `Section ${index + 1}`
          const status = getSectionNavigationStatus(section)
          const sectionKey = section?.sectionKey || section?.key || getSectionDomId(section, index)
          const isActive = activeKey === sectionKey
          return (
            <li key={`${sectionKey}-nav`}>
              <button
                type="button"
                className={[
                  'runtime-workspace__section-nav-button',
                  isActive && 'runtime-workspace__section-nav-button--active',
                ].filter(Boolean).join(' ')}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => onSelectSection?.(index)}
              >
                <span>{index + 1}</span>
                <strong>{label}</strong>
                <small>{status}</small>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function DiscoverySection({ discoveryState = 'Evidence Not Ready' }) {
  return (
    <Card variant="default" className="runtime-workspace__section-card">
      <Card.Body className="runtime-workspace__section-body">
        <div className="runtime-workspace__section-heading">
          <div>
            <h2>Discovery</h2>
            <p>Section 0 evidence layer for downstream guided execution.</p>
          </div>
          <div className="runtime-workspace__section-badges">
            <Badge variant="info" size="sm" pill outline>Section 0</Badge>
            <Badge variant="neutral" size="sm" pill outline>{discoveryState}</Badge>
          </div>
        </div>
        <div
          className="runtime-workspace__section-panels"
          role="region"
          aria-label="Discovery state"
        >
          <section className="runtime-workspace__section-panel" aria-label="Discovery inputs">
            <h3>Discovery Inputs</h3>
            <p>No discovery input projection is available yet.</p>
          </section>
          <section className="runtime-workspace__section-panel" aria-label="Evidence pack">
            <h3>Evidence Pack</h3>
            <p>No discovery evidence pack is projected for this runtime yet.</p>
          </section>
          <section className="runtime-workspace__section-panel" aria-label="Scoped evidence views">
            <h3>Scoped Evidence Views</h3>
            <p>Section-scoped evidence will appear here when the backend projects it.</p>
          </section>
          <section className="runtime-workspace__section-panel" aria-label="Discovery acceptance">
            <h3>Acceptance</h3>
            <p>Discovery has not been accepted for governed downstream generation.</p>
          </section>
        </div>
      </Card.Body>
    </Card>
  )
}

function RuntimeWorkspace() {
  const navigate = useNavigate()
  const { runtimeInstanceId = '' } = useParams()
  const {
    data: rendererResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetRuntimeRendererQuery(
    { runtimeInstanceId },
    { skip: !runtimeInstanceId },
  )
  const [mutateRuntimeState] = useMutateRuntimeStateMutation()
  const [executeRuntimeAction] = useExecuteRuntimeActionMutation()
  const [savingRuntimePath, setSavingRuntimePath] = useState('')
  const [executingActionKey, setExecutingActionKey] = useState('')
  const [actionFeedback, setActionFeedback] = useState(null)
  const [sectionFeedbackByPath, setSectionFeedbackByPath] = useState({})
  const [activeWorkspaceKey, setActiveWorkspaceKey] = useState(DISCOVERY_NAV_KEY)

  const renderer = getRendererPayload(rendererResponse)
  const runtimeInstance = renderer?.runtimeInstance ?? {}
  const sections = Array.isArray(renderer?.sections) ? renderer.sections : EMPTY_ARRAY
  const actions = Array.isArray(renderer?.actions) ? renderer.actions : EMPTY_ARRAY
  const sectionActionByKey = actions.reduce((acc, action) => {
    const actionKey = normalizeRuntimeActionToken(action?.governedAction || action?.actionKey)
    if (SECTION_ACTION_KEY_SET.has(actionKey)) {
      acc[actionKey] = action
    }
    return acc
  }, {})
  const sidePanelActions = actions.filter((action) =>
    !SECTION_ACTION_KEY_SET.has(normalizeRuntimeActionToken(action?.governedAction || action?.actionKey)),
  )
  const signals = Array.isArray(renderer?.signals) ? renderer.signals : EMPTY_ARRAY
  const activity = Array.isArray(renderer?.activity) ? renderer.activity : EMPTY_ARRAY
  const discoveryState = getDiscoveryState(renderer)
  const configWarnings = Array.isArray(renderer?.diagnostics?.configWarnings)
    ? renderer.diagnostics.configWarnings
    : EMPTY_ARRAY
  const showRuntimePaths = String(renderer?.diagnostics?.runtimePathVisibility ?? '').trim().toUpperCase() === 'VISIBLE'
  const appError = error ? normalizeError(error) : null

  const runtimeStatus = getRuntimeLifecycleStatus(runtimeInstance)
  const executionState = getRuntimeExecutionState(runtimeInstance)
  const runtimeDisplayId = getRuntimeInstanceDisplayId(
    runtimeInstance,
    runtimeInstance?.runtimeType ?? 'VALUE_NARRATIVE',
  )
  const packageName = String(renderer?.package?.packageName ?? runtimeInstance?.packageName ?? '').trim()
  const packageKey = String(renderer?.package?.packageKey ?? runtimeInstance?.packageKey ?? '').trim()
  const packageVersion = String(renderer?.package?.frameworkVersion ?? runtimeInstance?.packageVersion ?? '').trim()
  const packageSummary = [packageName || packageKey, packageVersion].filter(Boolean).join(' / ') || '--'
  const validationState = renderer?.validation?.state ?? 'UNKNOWN'
  const readinessState = renderer?.readiness?.state ?? 'DRAFT'
  const publishState = renderer?.publish?.state ?? 'UNKNOWN'
  const lockState = renderer?.lock?.state ?? 'UNKNOWN'
  const summaryItems = [
    {
      key: 'runtime-status',
      label: 'Runtime Status',
      value: formatRuntimeTokenLabel(runtimeStatus),
      variant: getRuntimeStatusVariant(runtimeStatus),
    },
    {
      key: 'execution',
      label: 'Execution',
      value: formatRuntimeTokenLabel(executionState),
      variant: getExecutionStateVariant(executionState),
    },
    {
      key: 'lifecycle-stage',
      label: 'Lifecycle Stage',
      value: formatRuntimeTokenLabel(renderer?.lifecycle?.stage ?? 'DRAFT'),
    },
    {
      key: 'validation',
      label: 'Validation',
      value: formatRuntimeTokenLabel(validationState),
      variant: getTokenStatusVariant(validationState),
    },
    {
      key: 'readiness',
      label: 'Readiness',
      value: formatRuntimeTokenLabel(readinessState),
      variant: getTokenStatusVariant(readinessState),
    },
    {
      key: 'publish',
      label: 'Publish',
      value: formatRuntimeTokenLabel(publishState),
      variant: getTokenStatusVariant(publishState),
    },
    {
      key: 'lock',
      label: 'Lock',
      value: formatRuntimeTokenLabel(lockState),
      variant: getTokenStatusVariant(lockState),
    },
    {
      key: 'package',
      label: 'Package',
      value: packageSummary,
    },
  ]
  const matchedActiveSectionIndex = sections.findIndex((section) =>
    (section?.sectionKey || section?.key) === activeWorkspaceKey,
  )
  const activeSectionIndex = matchedActiveSectionIndex >= 0 ? matchedActiveSectionIndex : 0
  const activeSection = activeWorkspaceKey === DISCOVERY_NAV_KEY
    ? null
    : matchedActiveSectionIndex >= 0 ? sections[matchedActiveSectionIndex] : null

  useEffect(() => {
    if (activeWorkspaceKey === DISCOVERY_NAV_KEY) return
    const hasActiveSection = sections.some((section) =>
      (section?.sectionKey || section?.key) === activeWorkspaceKey,
    )
    if (!hasActiveSection) {
      setActiveWorkspaceKey(DISCOVERY_NAV_KEY)
    }
  }, [activeWorkspaceKey, sections])

  const handleBack = () => {
    navigate('/app/dashboard')
  }

  const setSectionFeedback = (runtimePath, feedback) => {
    setSectionFeedbackByPath((current) => ({
      ...current,
      [runtimePath]: feedback,
    }))
  }

  const handleSaveSection = async ({ section, value }) => {
    const runtimePath = section?.runtimePath
    if (!runtimePath) return false

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    setSavingRuntimePath(runtimePath)
    setSectionFeedback(runtimePath, null)

    try {
      await mutateRuntimeState({
        runtimeInstanceId,
        body: {
          runtimePath,
          operation: 'WRITE',
          value,
          expectedUpdatedAt,
        },
      }).unwrap()
      setSectionFeedback(runtimePath, {
        variant: 'success',
        message: 'Section saved.',
      })
      await refetch()
      return true
    } catch (mutationError) {
      const normalizedError = normalizeError(mutationError)
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      setSavingRuntimePath('')
    }
  }

  const handleSaveSectionAndNext = async ({ section, value }) => {
    const saved = await handleSaveSection({ section, value })
    if (!saved) return

    const currentIndex = sections.findIndex((candidate) =>
      (candidate?.sectionKey || candidate?.key) === (section?.sectionKey || section?.key),
    )
    const nextSection = sections[currentIndex + 1]
    if (nextSection) {
      setActiveWorkspaceKey(nextSection.sectionKey || nextSection.key)
      return
    }
    setActiveWorkspaceKey(DISCOVERY_NAV_KEY)
  }

  const handleSelectSection = (index) => {
    const section = sections[index]
    if (!section) return
    setActiveWorkspaceKey(section.sectionKey || section.key)
  }

  const handleExecuteAction = async (action, actionBody = {}) => {
    const actionKey = normalizeRuntimeActionToken(action?.governedAction || action?.actionKey)
    if (!actionKey || !action?.enabled) return

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setActionFeedback({
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return
    }

    const confirmationMessage = String(action?.confirmationMessage ?? '').trim()
      || getDefaultConfirmationMessage(action)
    if (action?.requiresConfirmation && !window.confirm(confirmationMessage)) {
      return
    }

    setExecutingActionKey(actionKey)
    setActionFeedback(null)

    try {
      await executeRuntimeAction({
        runtimeInstanceId,
        actionKey,
        body: { expectedUpdatedAt, ...actionBody },
      }).unwrap()
      setActionFeedback({
        variant: 'success',
        message: action?.successMessage || 'Runtime action completed.',
      })
      await refetch()
    } catch (actionError) {
      const normalizedError = normalizeError(actionError)
      setActionFeedback({
        variant: 'error',
        message: normalizedError.message,
      })
    } finally {
      setExecutingActionKey('')
    }
  }

  const handleExecuteSectionAction = async ({ action, section }) => {
    await handleExecuteAction(action, {
      runtimePath: section?.runtimePath,
      sectionKey: section?.sectionKey || section?.key,
    })
  }

  if (isLoading) {
    return (
      <section className="runtime-workspace container" aria-label="Execution workspace">
        <Card variant="default" className="runtime-workspace__state-card">
          <Card.Body>
            <Status variant="info" size="sm" showIcon>Loading execution workspace</Status>
          </Card.Body>
        </Card>
      </section>
    )
  }

  if (appError) {
    return (
      <section className="runtime-workspace container" aria-label="Execution workspace">
        <div
          className="runtime-workspace__actions"
          role="group"
          aria-label="Execution workspace actions"
        >
          <Button type="button" variant="outline" size="sm" onClick={handleBack}>
            Back
          </Button>
        </div>
        <ErrorSupportPanel error={appError} context="runtime-workspace-renderer" />
      </section>
    )
  }

  return (
    <section className="runtime-workspace container" aria-label="Execution workspace">
      <Card variant="default" className="runtime-workspace__hero">
        <Card.Body className="runtime-workspace__hero-body">
          <div
            className="runtime-workspace__actions"
            role="group"
            aria-label="Execution workspace actions"
          >
            <Button type="button" variant="outline" size="sm" onClick={handleBack}>
              Back
            </Button>
            {isFetching ? (
              <Status variant="info" size="sm" showIcon>Refreshing</Status>
            ) : null}
          </div>
          <div className="runtime-workspace__hero-copy">
            <Badge variant="info" size="sm" pill outline icon={<MdOutlineRoute aria-hidden="true" />}>
              Execution Workspace
            </Badge>
            <h1>{runtimeInstance?.name || 'Execution Workspace'}</h1>
            <p>{runtimeDisplayId}</p>
            <RuntimeProgressSummary sections={sections} configWarnings={configWarnings} />
          </div>
          <ul className="runtime-workspace__summary-grid" aria-label="Execution workspace summary">
            {summaryItems.map((item) => (
              <RuntimeSummaryTile
                key={item.key}
                label={item.label}
                value={item.value}
                variant={item.variant}
              />
            ))}
          </ul>
        </Card.Body>
      </Card>

      <div className="runtime-workspace__layout">
        <main className="runtime-workspace__main" aria-label="Guided execution sections">
          <div className="runtime-workspace__section-title-row">
            <h2>Guided Sections</h2>
            <Badge variant="neutral" size="sm" pill outline>
              {activeWorkspaceKey === DISCOVERY_NAV_KEY ? 'Discovery active' : '1 active'}
            </Badge>
          </div>
          {activeWorkspaceKey === DISCOVERY_NAV_KEY ? (
            <DiscoverySection discoveryState={discoveryState} />
          ) : activeSection ? (
            <ul className="runtime-workspace__section-list" aria-label="Runtime section cards">
              <RuntimeSection
                key={`${activeSection.key ?? activeSection.runtimePath}-${stringifyValue(activeSection.value)}`}
                id={getSectionDomId(activeSection, activeSectionIndex)}
                section={activeSection}
                disabled={savingRuntimePath === activeSection.runtimePath}
                executingActionKey={executingActionKey}
                feedback={sectionFeedbackByPath[activeSection.runtimePath]}
                generationActions={sectionActionByKey}
                onExecuteSectionAction={handleExecuteSectionAction}
                onSave={handleSaveSection}
                onSaveAndNext={handleSaveSectionAndNext}
                showRuntimePath={showRuntimePaths}
              />
            </ul>
          ) : (
            <Card variant="default" className="runtime-workspace__state-card">
              <Card.Body>
                <Status variant="warning" size="sm" showIcon>No guided sections available</Status>
              </Card.Body>
            </Card>
          )}
        </main>

        <aside className="runtime-workspace__aside" aria-label="Execution intelligence side panel">
          <Card variant="default" className="runtime-workspace__panel">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading">
                <MdOutlineRoute aria-hidden="true" />
                <h2>Guided Sections</h2>
              </div>
              <RuntimeSectionNavigation
                activeKey={activeWorkspaceKey}
                discoveryState={discoveryState}
                onSelectDiscovery={() => setActiveWorkspaceKey(DISCOVERY_NAV_KEY)}
                onSelectSection={handleSelectSection}
                sections={sections}
              />
            </Card.Body>
          </Card>

          <Card variant="default" className="runtime-workspace__panel">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading">
                <MdInfoOutline aria-hidden="true" />
                <h2>Discovery State</h2>
              </div>
              <Status variant={discoveryState === 'Evidence Ready' ? 'success' : 'neutral'} size="sm" showIcon>
                {discoveryState}
              </Status>
            </Card.Body>
          </Card>

          <Card variant="default" className="runtime-workspace__panel">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading">
                <MdBolt aria-hidden="true" />
                <h2>Actions</h2>
              </div>
              {actionFeedback ? (
                <Status variant={actionFeedback.variant} size="sm" showIcon>
                  {actionFeedback.message}
                </Status>
              ) : null}
              {sidePanelActions.length > 0 ? (
                <div className="runtime-workspace__action-list">
                  {sidePanelActions.map((action) => (
                    <RuntimeActionButton
                      key={action.actionKey}
                      action={action}
                      disabled={Boolean(executingActionKey)}
                      executing={executingActionKey === normalizeRuntimeActionToken(action.governedAction || action.actionKey)}
                      onExecute={handleExecuteAction}
                    />
                  ))}
                </div>
              ) : (
                <Status variant="neutral" size="sm" showIcon>No actions available</Status>
              )}
            </Card.Body>
          </Card>

          <Card variant="default" className="runtime-workspace__panel">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading">
                <MdOutlineWarningAmber aria-hidden="true" />
                <h2>Signals</h2>
              </div>
              {signals.length > 0 ? (
                <ul className="runtime-workspace__plain-list">
                  {signals.map((signal) => (
                    <li key={signal.id ?? signal.signalId}>{signal.summary ?? signal.message}</li>
                  ))}
                </ul>
              ) : (
                <Status variant="neutral" size="sm" showIcon>No runtime signals</Status>
              )}
            </Card.Body>
          </Card>

          <Card variant="default" className="runtime-workspace__panel">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading">
                <MdOutlineHistory aria-hidden="true" />
                <h2>Activity</h2>
              </div>
              {activity.length > 0 ? (
                <ul className="runtime-workspace__plain-list">
                  {activity.map((event) => (
                    <li key={event.eventId ?? event.id}>{event.summary}</li>
                  ))}
                </ul>
              ) : (
                <Status variant="neutral" size="sm" showIcon>No runtime activity</Status>
              )}
            </Card.Body>
          </Card>

          {configWarnings.length > 0 ? (
            <Card variant="default" className="runtime-workspace__panel">
              <Card.Body className="runtime-workspace__panel-body">
                <div className="runtime-workspace__panel-heading">
                  <MdInfoOutline aria-hidden="true" />
                  <h2>Workspace Warnings</h2>
                </div>
                <ul className="runtime-workspace__plain-list">
                  {configWarnings.map((warning, index) => (
                    <li key={`${warning.code}-${index}`}>
                      <div className="runtime-workspace__warning-heading">
                        <Badge
                          variant={getWarningSeverityVariant(warning.severity)}
                          size="sm"
                          pill
                          outline
                        >
                          {normalizeWarningSeverity(warning.severity)}
                        </Badge>
                        <strong>{warning.code}</strong>
                      </div>
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

export default RuntimeWorkspace
