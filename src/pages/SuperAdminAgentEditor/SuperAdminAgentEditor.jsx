import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Spinner } from '../../components/Spinner'
import { useToaster } from '../../components/Toaster'
import {
  useCreateRuntimeAgentMutation,
  useGetRuntimeAgentQuery,
  useGetRuntimeAgentDependenciesQuery,
  useListFrameworkRegistriesQuery,
  useListRuntimeAgentsQuery,
  useListRuntimeSkillsQuery,
  useUpdateRuntimeAgentMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  buildFrameworkRegistryOptions,
  FRAMEWORK_REGISTRY_STATUSES,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  INITIAL_RUNTIME_AGENT_FORM,
  mapRuntimeAgentToForm,
  validateRuntimeAgentForm,
} from '../SuperAdminAgents/superAdminAgents.constants.js'
import {
  RuntimeAgentFormFields,
} from '../SuperAdminAgents/RuntimeAgentDialogs.jsx'
import '../SuperAdminAgents/SuperAdminAgents.css'
import '../SuperAdminAgents/RuntimeAgentListView.css'
import '../SuperAdminAgents/RuntimeAgentDialogs.css'
import './SuperAdminAgentEditor.css'

const shallowEqualObject = (left, right) => {
  if (left === right) return true
  if (!left || !right) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => left[key] === right[key])
}

function AgentEditorLoadingState() {
  return (
    <Card variant="elevated" className="super-admin-agents__card super-admin-agent-editor__loading-card">
      <Card.Body className="super-admin-agents__card-body super-admin-agents__card-body--compact super-admin-agent-editor__loading-body">
        <Spinner size="lg" />
        <p className="super-admin-agents__muted">Loading agent details...</p>
      </Card.Body>
    </Card>
  )
}

function AgentEditorErrorState({ message, onBack }) {
  return (
    <Card variant="elevated" className="super-admin-agents__card super-admin-agent-editor__error-card">
      <Card.Body className="super-admin-agents__card-body super-admin-agents__card-body--compact super-admin-agent-editor__error-body">
        <p className="super-admin-agents__error" role="alert">
          {message}
        </p>
        <div className="super-admin-agents__catalogue-actions super-admin-agent-editor__top-actions">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}

function SuperAdminAgentEditor() {
  const navigate = useNavigate()
  const { agentId = '' } = useParams()
  const { addToast } = useToaster()
  const isEditMode = Boolean(agentId)

  const [form, setForm] = useState({
    ...INITIAL_RUNTIME_AGENT_FORM,
  })
  const [errors, setErrors] = useState({})
  const [errorsSource, setErrorsSource] = useState(null) // 'client' | 'server' | null
  const [activeEditorTab, setActiveEditorTab] = useState(0)
  const [showValidationHints, setShowValidationHints] = useState(false)

  const {
    data: agentResponse,
    isLoading: isAgentLoading,
    error: agentError,
  } = useGetRuntimeAgentQuery(agentId, {
    skip: !isEditMode,
  })

  const {
    data: dependenciesResponse,
    isLoading: isDependenciesLoading,
    error: dependenciesError,
  } = useGetRuntimeAgentDependenciesQuery(agentId, {
    skip: !isEditMode,
  })

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })
  const { data: agentsResponse } = useListRuntimeAgentsQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })
  const {
    data: skillsResponse,
    isLoading: isSkillsLoading,
    error: skillsError,
  } = useListRuntimeSkillsQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const [createRuntimeAgent, { isLoading: isCreating }] = useCreateRuntimeAgentMutation()
  const [updateRuntimeAgent, { isLoading: isUpdating }] = useUpdateRuntimeAgentMutation()

  const loadedAgent = agentResponse?.data ?? null
  const agentAppError = agentError ? normalizeError(agentError) : null
  const loadedDependencies = dependenciesResponse?.data ?? null
  const dependenciesAppError = dependenciesError ? normalizeError(dependenciesError) : null
  const activeFrameworkRegistryRows = useMemo(
    () =>
      (registryResponse?.data ?? []).filter(
        (entry) =>
          String(entry.status ?? '').trim().toUpperCase() === FRAMEWORK_REGISTRY_STATUSES.ACTIVE,
      ),
    [registryResponse],
  )
  const frameworkOptions = useMemo(
    () => buildFrameworkRegistryOptions(activeFrameworkRegistryRows, { includeAll: false }),
    [activeFrameworkRegistryRows],
  )
  const activeFrameworkKeys = useMemo(
    () => frameworkOptions.map((option) => option.value),
    [frameworkOptions],
  )
  const existingAgents = agentsResponse?.data ?? []
  const availableSkills = useMemo(() => {
    const direct = skillsResponse?.data

    if (Array.isArray(direct)) {
      return direct
    }

    if (direct && typeof direct === 'object' && Array.isArray(direct.data)) {
      return direct.data
    }

    if (Array.isArray(skillsResponse)) {
      return skillsResponse
    }

    return []
  }, [skillsResponse])
  const skillsAppError = skillsError ? normalizeError(skillsError) : null

  const liveValidation = useMemo(
    () =>
      validateRuntimeAgentForm(
        form,
        existingAgents,
        isEditMode ? agentId : '',
        activeFrameworkKeys,
        availableSkills,
      ),
    [
      form,
      existingAgents,
      isEditMode,
      agentId,
      activeFrameworkKeys,
      availableSkills,
    ],
  )

  const isCreateDisabled = useMemo(() => {
    if (isEditMode) return false
    if (isCreating) return true
    if (isSkillsLoading) return true

    return Object.keys(liveValidation.errors || {}).length > 0
  }, [isEditMode, isCreating, isSkillsLoading, liveValidation.errors])

  const isCreateReady = !isEditMode && !isCreateDisabled

  useEffect(() => {
    if (!isEditMode) {
      setForm({
        ...INITIAL_RUNTIME_AGENT_FORM,
      })
      setErrors({})
      setErrorsSource(null)
      setActiveEditorTab(0)
      setShowValidationHints(false)
      return
    }

    if (loadedAgent) {
      setForm(mapRuntimeAgentToForm(loadedAgent))
      setErrors({})
      setErrorsSource(null)
      setActiveEditorTab(0)
      setShowValidationHints(false)
    }
  }, [isEditMode, loadedAgent])

  useEffect(() => {
    if (isEditMode) return

    const liveErrors = liveValidation?.errors && typeof liveValidation.errors === 'object'
      ? liveValidation.errors
      : {}

    // Keep client-side validation UI in sync as the user fixes fields.
    if (errorsSource === 'client' && showValidationHints) {
      if (!shallowEqualObject(errors, liveErrors)) {
        setErrors(liveErrors)
      }

      if (Object.keys(liveErrors).length === 0) {
        setErrors({})
        setErrorsSource(null)
        setShowValidationHints(false)
      }
    }
  }, [errors, errorsSource, isEditMode, liveValidation, showValidationHints])

  const handleBackToAgents = () => {
    navigate('/super-admin/runtime-control/agents')
  }

  const handleReviewMissingFields = () => {
    const { errors: nextErrors } = validateRuntimeAgentForm(
      form,
      existingAgents,
      isEditMode ? agentId : '',
      activeFrameworkKeys,
      availableSkills,
    )

    setErrors(nextErrors)
    setErrorsSource('client')
    setShowValidationHints(true)

    if (!isEditMode) {
      const prefix = 'runtime-agent-create'
      const jumpTargets = [
        { tabIndex: 0, fieldKey: 'supportedFrameworkKeys', focusId: `${prefix}-framework-select` },
        { tabIndex: 1, fieldKey: 'defaultSkillIds', focusId: `${prefix}-skill-select` },
        { tabIndex: 2, fieldKey: 'executionPlan', focusId: `${prefix}-execution-add-skill` },
        { tabIndex: 4, fieldKey: 'inputContractJson', focusId: `${prefix}-input-contract` },
        { tabIndex: 4, fieldKey: 'outputContractJson', focusId: `${prefix}-output-contract` },
        { tabIndex: 5, fieldKey: 'policyMaxTokenBudget', focusId: `${prefix}-policy-max-token-budget` },
        { tabIndex: 5, fieldKey: 'policyTimeoutMs', focusId: `${prefix}-policy-timeout-ms` },
      ]

      const firstTabError = jumpTargets.find((target) => nextErrors?.[target.fieldKey])
        if (firstTabError) {
          setActiveEditorTab(firstTabError.tabIndex)
          requestAnimationFrame(() => {
            const el = document.getElementById(firstTabError.focusId)
            if (el && typeof el.focus === 'function') {
              if (typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }
              el.focus()
            }
          })
        }
      }

    if (Object.keys(nextErrors).length === 0) {
      addToast({
        title: 'All checks passed',
        description: 'This agent is ready to be created.',
        variant: 'success',
      })
      return
    }

    addToast({
      title: 'Missing required fields',
      description: 'Review the highlighted fields across the editor tabs.',
      variant: 'warning',
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    setErrorsSource(null)

    const { errors: nextErrors, payload } = validateRuntimeAgentForm(
      form,
      existingAgents,
      isEditMode ? agentId : '',
      activeFrameworkKeys,
      availableSkills,
    )

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setErrorsSource('client')
      setShowValidationHints(true)
      return
    }

    try {
      if (isEditMode) {
        await updateRuntimeAgent({
          agentId,
          ...payload,
        }).unwrap()

        addToast({
          title: 'Agent updated',
          description: 'The agent editor changes were saved successfully.',
          variant: 'success',
        })
      } else {
        await createRuntimeAgent({
          ...payload,
        }).unwrap()

        addToast({
          title: 'Agent created',
          description: `${payload.name} is now available in the Runtime Control catalogue.`,
          variant: 'success',
        })
      }

      navigate('/super-admin/runtime-control/agents')
    } catch (err) {
      const appError = normalizeError(err)
      const field = String(appError?.details?.field ?? '').trim()

      if (field) {
        setErrors({ [field]: appError.message })
        setErrorsSource('server')
        setShowValidationHints(true)
        return
      }

      addToast({
        title: isEditMode ? 'Failed to update agent' : 'Failed to create agent',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  return (
    <section
      className="super-admin-agents super-admin-agent-editor container"
      aria-label="Super admin runtime agent editor"
    >
      <header className="super-admin-agents__header">
        <h1 className="super-admin-agents__title">{isEditMode ? 'Agent Editor' : 'Create Agent'}</h1>
        <p className="super-admin-agents__subtitle">
          Govern runtime agents, control their availability, and define the framework and skill
          metadata that downstream Runtime Control modules depend on.
        </p>
      </header>

      <Fieldset className="super-admin-agent-editor__fieldset">
        <Fieldset.Legend className="sr-only">Runtime agent editor</Fieldset.Legend>
        {isEditMode && isAgentLoading ? <AgentEditorLoadingState /> : null}
        {isEditMode && agentAppError ? (
          <AgentEditorErrorState message={agentAppError.message} onBack={handleBackToAgents} />
        ) : null}
        {!isAgentLoading && !agentAppError ? (
          <Card variant="elevated" className="super-admin-agents__card super-admin-agent-editor__card">
            <form className="super-admin-agents__form super-admin-agent-editor__form" onSubmit={handleSubmit} noValidate>
              <Card.Body className="super-admin-agents__card-body super-admin-agents__card-body--compact super-admin-agent-editor__card-body">
                <div className="super-admin-agents__catalogue-actions super-admin-agent-editor__top-actions">
                  <Button type="button" variant="outline" size="sm" onClick={handleBackToAgents}>
                    Back
                  </Button>
                </div>

                <div className="super-admin-agent-editor__intro">
                  <p className="super-admin-agent-editor__form-title">
                    {isEditMode
                      ? 'Editor surface for an existing runtime agent.'
                      : 'Editor surface for a new runtime agent.'}
                  </p>
                  <p className="super-admin-agents__table-note">
                    Keep the editor aligned to the Runtime Control agent catalogue by using the
                    same naming, framework compatibility, and lifecycle conventions shown on the
                    main agents page.
                  </p>
                </div>

                <RuntimeAgentFormFields
                  prefix={isEditMode ? 'runtime-agent-edit' : 'runtime-agent-create'}
                  isEditMode={isEditMode}
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  validationHints={showValidationHints ? liveValidation.errors : {}}
                  activeTab={activeEditorTab}
                  onTabChange={setActiveEditorTab}
                  frameworkOptions={frameworkOptions}
                  availableSkills={availableSkills}
                  isSkillsLoading={isSkillsLoading}
                  skillsError={skillsAppError?.message ?? ''}
                  dependencies={loadedDependencies}
                  isDependenciesLoading={isDependenciesLoading}
                  dependenciesError={dependenciesAppError?.message ?? ''}
                />

                <div className="super-admin-agents__catalogue-actions super-admin-agent-editor__footer-actions">
                  <Button type="button" variant="outline" size="sm" onClick={handleBackToAgents}>
                    Cancel
                  </Button>
                  {isEditMode ? (
                    <Button type="submit" variant="primary" size="sm" loading={isUpdating}>
                      Save Changes
                    </Button>
                  ) : isCreateReady ? (
                    <Button type="submit" variant="primary" size="sm" loading={isCreating}>
                      Create Agent
                    </Button>
                  ) : (
                    <Button type="button" variant="primary" size="sm" onClick={handleReviewMissingFields}>
                      Review missing fields
                    </Button>
                  )}
                </div>
              </Card.Body>
            </form>
          </Card>
        ) : null}
      </Fieldset>
    </section>
  )
}

export default SuperAdminAgentEditor
