import { useNavigate, useParams } from 'react-router-dom'
import {
  MdBolt,
  MdInfoOutline,
  MdOutlineHistory,
  MdOutlineRoute,
  MdOutlineWarningAmber,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Input } from '../../components/Input'
import { Status } from '../../components/Status'
import { Textarea } from '../../components/Textarea'
import { useGetRuntimeRendererQuery } from '../../store/api/runtimeInstanceApi.js'
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
const ACTION_PREVIEW_NOTE_ID = 'runtime-action-preview-note'

const getRendererPayload = (response) => response?.data ?? null

const stringifyValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
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

function RuntimeValueControl({ section }) {
  const control = String(section?.control ?? 'TEXT').trim().toUpperCase()
  const value = section?.value
  const label = section?.label ?? section?.key ?? 'Runtime field'
  const error = getSectionValidationError(section)
  const helperText = getSectionHelperText(section)
  const commonProps = {
    label,
    value: stringifyValue(value),
    placeholder: section?.placeholder ?? '',
    required: Boolean(section?.required),
    error,
    helperText,
    fullWidth: true,
  }

  if (control === 'TEXTAREA') {
    return (
      <Textarea
        {...commonProps}
        readOnly
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
        readOnly
      />
    )
  }

  if (control === 'CHECKBOX') {
    return (
      <label className="runtime-workspace__checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          readOnly
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
        <select value={stringifyValue(value)} disabled>
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
      <div className="runtime-workspace__json-field" aria-label={label}>
        <span>{label}</span>
        <pre>{stringifyValue(value) || '{}'}</pre>
      </div>
    )
  }

  return (
    <Input
      {...commonProps}
      type="text"
      readOnly
    />
  )
}

function RuntimeSection({ section }) {
  const validationMessages = Array.isArray(section?.validationMessages)
    ? section.validationMessages
    : []

  return (
    <Card variant="default" className="runtime-workspace__section-card" role="listitem">
      <Card.Body className="runtime-workspace__section-body">
        <div className="runtime-workspace__section-heading">
          <div>
            <h2>{section.label}</h2>
            <p>{section.runtimePath}</p>
          </div>
          <div className="runtime-workspace__section-badges">
            {section.required ? (
              <Badge variant="warning" size="sm" pill outline>Required</Badge>
            ) : null}
            <Badge variant="neutral" size="sm" pill outline>Read only preview</Badge>
          </div>
        </div>
        <RuntimeValueControl section={section} />
        {validationMessages.length > 0 ? (
          <ul className="runtime-workspace__validation-list" aria-label={`${section.label} validation messages`}>
            {validationMessages.map((message, index) => (
              <li key={`${message.validationKey ?? section.key}-${index}`}>
                <Status
                  variant={String(message.severity ?? '').toUpperCase() === 'ERROR' ? 'danger' : 'warning'}
                  size="sm"
                  showIcon
                >
                  {message.message}
                </Status>
              </li>
            ))}
          </ul>
        ) : null}
      </Card.Body>
    </Card>
  )
}

function RuntimeActionButton({ action }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled
      aria-describedby={ACTION_PREVIEW_NOTE_ID}
      title={action.enabled ? 'Runtime Execution action execution is not live yet.' : action.disabledReason}
      leftIcon={<MdBolt aria-hidden="true" />}
    >
      {action.buttonLabel}
    </Button>
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
  } = useGetRuntimeRendererQuery(
    { runtimeInstanceId },
    { skip: !runtimeInstanceId },
  )

  const renderer = getRendererPayload(rendererResponse)
  const runtimeInstance = renderer?.runtimeInstance ?? {}
  const sections = Array.isArray(renderer?.sections) ? renderer.sections : EMPTY_ARRAY
  const actions = Array.isArray(renderer?.actions) ? renderer.actions : EMPTY_ARRAY
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

  const handleBack = () => {
    navigate('/app/dashboard')
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
          <dl className="runtime-workspace__summary-grid" aria-label="Runtime workspace summary">
            <div>
              <dt>Runtime Status</dt>
              <dd>
                <Status variant={getRuntimeStatusVariant(runtimeStatus)} size="sm" showIcon>
                  {formatRuntimeTokenLabel(runtimeStatus)}
                </Status>
              </dd>
            </div>
            <div>
              <dt>Execution</dt>
              <dd>
                <Status variant={getExecutionStateVariant(executionState)} size="sm" showIcon>
                  {formatRuntimeTokenLabel(executionState)}
                </Status>
              </dd>
            </div>
            <div>
              <dt>Lifecycle Stage</dt>
              <dd>{formatRuntimeTokenLabel(renderer?.lifecycle?.stage ?? 'DRAFT')}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{packageSummary}</dd>
            </div>
          </dl>
        </Card.Body>
      </Card>

      <div className="runtime-workspace__layout">
        <main className="runtime-workspace__main" aria-label="Runtime sections">
          <div className="runtime-workspace__section-title-row">
            <h2>Runtime Sections</h2>
            <Badge variant="neutral" size="sm" pill outline>{sections.length} visible</Badge>
          </div>
          {sections.length > 0 ? (
            <div className="runtime-workspace__section-list" role="list">
              {sections.map((section) => (
                <RuntimeSection key={section.key ?? section.runtimePath} section={section} />
              ))}
            </div>
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
              {actions.length > 0 ? (
                <p id={ACTION_PREVIEW_NOTE_ID} className="runtime-workspace__feedback">
                  Runtime action execution is not live in this preview.
                </p>
              ) : null}
              {actions.length > 0 ? (
                <div className="runtime-workspace__action-list">
                  {actions.map((action) => (
                    <RuntimeActionButton
                      key={action.actionKey}
                      action={action}
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
