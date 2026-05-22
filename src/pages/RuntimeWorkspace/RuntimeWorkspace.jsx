import { useState } from 'react'
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

const stringifyValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

const stringifyGeneratedContent = (generated) => {
  if (!generated) return ''
  if (typeof generated.content === 'string') return generated.content
  return stringifyValue(generated.content ?? generated)
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
    return '[\n  "Add one relevant point for this section."\n]'
  }

  if (control === 'JSON' || dataType === 'OBJECT') {
    if (label === 'executive summary') {
      return '{\n  "summary": "Summarise the customer situation, priority, and recommended value narrative focus."\n}'
    }

    return `{\n  "summary": "Add a concise ${label} note for this value narrative."\n}`
  }

  return `Add ${label} details here.`
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
      throw new Error('Enter valid JSON before saving.')
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
  onExecuteSectionAction,
  onSave,
  section,
}) {
  const validationMessages = Array.isArray(section?.validationMessages)
    ? section.validationMessages
    : []
  const currentValue = stringifyValue(section?.value)
  const [draftValue, setDraftValue] = useState(currentValue)
  const [localError, setLocalError] = useState('')
  const [showCompare, setShowCompare] = useState(false)
  const editable = Boolean(section?.editable)
  const isDirty = draftValue !== currentValue
  const isSaving = Boolean(disabled)
  const canSave = editable && isDirty && !isSaving
  const generatedContent = stringifyGeneratedContent(section?.generated)
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSave) return

    let value
    try {
      value = parseDraftValue(section, draftValue)
    } catch (parseError) {
      setLocalError(parseError.message)
      return
    }

    await onSave?.({ section, value })
  }

  return (
    <li className="runtime-workspace__section-item">
      <Card variant="default" className="runtime-workspace__section-card">
        <Card.Body className="runtime-workspace__section-body">
          <form className="runtime-workspace__section-form" onSubmit={handleSubmit}>
            <div className="runtime-workspace__section-heading">
              <div>
                <h2>{section.label}</h2>
                <p>{section.runtimePath}</p>
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
            <RuntimeValueControl
              section={section}
              value={draftValue}
              editable={editable}
              disabled={isSaving}
              onChange={handleChange}
            />
            <div
              className="runtime-workspace__section-panels"
              role="region"
              aria-label="Section object"
            >
              <section className="runtime-workspace__section-panel" aria-label="Input panel">
                <h3>Input</h3>
                <p>{currentValue || 'No input yet'}</p>
              </section>
              <section className="runtime-workspace__section-panel" aria-label="Generated panel">
                <h3>Generated</h3>
                <p>{generatedContent || 'No generated content yet'}</p>
              </section>
              <section className="runtime-workspace__section-panel" aria-label="Review panel">
                <h3>Review</h3>
                <p>{formatRuntimeTokenLabel(section?.review?.status || 'PENDING_REVIEW')}</p>
              </section>
              <section className="runtime-workspace__section-panel" aria-label="State panel">
                <h3>State</h3>
                <p>
                  {formatRuntimeTokenLabel(section?.state?.status || 'DRAFT')}
                  {Number(section?.state?.revisionCount || 0) > 0
                    ? `, ${section.state.revisionCount} revision${section.state.revisionCount === 1 ? '' : 's'}`
                    : ''}
                </p>
              </section>
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
                  <p>{generatedContent || 'No generated content yet'}</p>
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
  const configWarnings = Array.isArray(renderer?.diagnostics?.configWarnings)
    ? renderer.diagnostics.configWarnings
    : EMPTY_ARRAY
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
    if (!runtimePath) return

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return
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
    } catch (mutationError) {
      const normalizedError = normalizeError(mutationError)
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: normalizedError.message,
      })
    } finally {
      setSavingRuntimePath('')
    }
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
      <section className="runtime-workspace container" aria-label="Runtime workspace">
        <Card variant="default" className="runtime-workspace__state-card">
          <Card.Body>
            <Status variant="info" size="sm" showIcon>Loading runtime workspace</Status>
          </Card.Body>
        </Card>
      </section>
    )
  }

  if (appError) {
    return (
      <section className="runtime-workspace container" aria-label="Runtime workspace">
        <div
          className="runtime-workspace__actions"
          role="group"
          aria-label="Runtime workspace actions"
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
    <section className="runtime-workspace container" aria-label="Runtime workspace">
      <Card variant="default" className="runtime-workspace__hero">
        <Card.Body className="runtime-workspace__hero-body">
          <div
            className="runtime-workspace__actions"
            role="group"
            aria-label="Runtime workspace actions"
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
              Runtime Workspace
            </Badge>
            <h1>{runtimeInstance?.name || 'Runtime Workspace'}</h1>
            <p>{runtimeDisplayId}</p>
          </div>
          <ul className="runtime-workspace__summary-grid" aria-label="Runtime workspace summary">
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
        <main className="runtime-workspace__main" aria-label="Runtime sections">
          <div className="runtime-workspace__section-title-row">
            <h2>Runtime Sections</h2>
            <Badge variant="neutral" size="sm" pill outline>{sections.length} visible</Badge>
          </div>
          {sections.length > 0 ? (
            <ul className="runtime-workspace__section-list" aria-label="Runtime section cards">
              {sections.map((section) => (
                <RuntimeSection
                  key={`${section.key ?? section.runtimePath}-${stringifyValue(section.value)}`}
                  section={section}
                  disabled={savingRuntimePath === section.runtimePath}
                  executingActionKey={executingActionKey}
                  feedback={sectionFeedbackByPath[section.runtimePath]}
                  generationActions={sectionActionByKey}
                  onExecuteSectionAction={handleExecuteSectionAction}
                  onSave={handleSaveSection}
                />
              ))}
            </ul>
          ) : (
            <Card variant="default" className="runtime-workspace__state-card">
              <Card.Body>
                <Status variant="warning" size="sm" showIcon>No runtime sections available</Status>
              </Card.Body>
            </Card>
          )}
        </main>

        <aside className="runtime-workspace__aside" aria-label="Runtime renderer side panel">
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
                  <h2>Renderer Warnings</h2>
                </div>
                <ul className="runtime-workspace__plain-list">
                  {configWarnings.map((warning, index) => (
                    <li key={`${warning.code}-${index}`}>
                      <strong>{warning.code}</strong>
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
