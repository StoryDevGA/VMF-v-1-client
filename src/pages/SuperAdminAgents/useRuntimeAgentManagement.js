import { useCallback, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useDisableRuntimeAgentMutation,
  useActivateRuntimeAgentMutation,
  useDeprecateRuntimeAgentMutation,
  useValidateRuntimeAgentMutation,
  useTestRuntimeAgentMutation,
  useListFrameworkRegistriesQuery,
  useListRuntimeAgentsQuery,
  useUpdateRuntimeAgentMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  buildFrameworkRegistryOptions,
  FRAMEWORK_REGISTRY_STATUSES,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  RUNTIME_AGENT_PAGE_SIZE,
  RUNTIME_AGENT_STATUSES,
} from './superAdminAgents.constants.js'

const parseJsonObject = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return { value: {}, error: null }
  }

  try {
    const parsed = JSON.parse(raw)
    const isPlainObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    if (!isPlainObject) {
      return { value: null, error: 'Must be a JSON object.' }
    }
    return { value: parsed, error: null }
  } catch (_err) {
    return { value: null, error: 'Invalid JSON.' }
  }
}

export function useRuntimeAgentManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [page, setPage] = useState(1)

  const [testOpen, setTestOpen] = useState(false)
  const [testAgent, setTestAgent] = useState(null)
  const [testForm, setTestForm] = useState({
    frameworkKey: '',
    inputJson: '{}',
    contextJson: '{}',
  })
  const [testErrors, setTestErrors] = useState({})
  const [testResult, setTestResult] = useState(null)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListRuntimeAgentsQuery({
    page,
    pageSize: RUNTIME_AGENT_PAGE_SIZE,
    q: search.trim(),
    status: statusFilter || undefined,
    frameworkKey: frameworkFilter || undefined,
  })

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const [updateRuntimeAgent] = useUpdateRuntimeAgentMutation()
  const [activateRuntimeAgent] = useActivateRuntimeAgentMutation()
  const [disableRuntimeAgent] = useDisableRuntimeAgentMutation()
  const [deprecateRuntimeAgent] = useDeprecateRuntimeAgentMutation()
  const [validateRuntimeAgent] = useValidateRuntimeAgentMutation()
  const [testRuntimeAgent] = useTestRuntimeAgentMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null
  const registryRows = registryResponse?.data ?? []
  const frameworkOptions = buildFrameworkRegistryOptions(registryRows)
  const activeFrameworkOptions = buildFrameworkRegistryOptions(
    registryRows.filter(
      (entry) => String(entry.status ?? '').trim().toUpperCase() === FRAMEWORK_REGISTRY_STATUSES.ACTIVE,
    ),
    { includeAll: false },
  )

  const openTestDialog = useCallback((agent) => {
    const frameworks = Array.isArray(agent?.supportedFrameworkKeys) ? agent.supportedFrameworkKeys : []

    setTestErrors({})
    setTestAgent(agent ?? null)
    setTestResult(null)
    setTestForm({
      frameworkKey: frameworks[0] ?? '',
      inputJson: '{}',
      contextJson: '{}',
    })
    setTestOpen(true)
  }, [])

  const closeTestDialog = useCallback(() => {
    setTestOpen(false)
    setTestAgent(null)
    setTestResult(null)
    setTestForm({
      frameworkKey: '',
      inputJson: '{}',
      contextJson: '{}',
    })
    setTestErrors({})
  }, [])

  const setAgentStatus = useCallback(
    async (agent, nextStatus) => {
      if (!agent?.id || agent.status === nextStatus) {
        return
      }

      try {
        if (nextStatus === RUNTIME_AGENT_STATUSES.ACTIVE) {
          await activateRuntimeAgent({ agentId: agent.id }).unwrap()
        } else if (nextStatus === RUNTIME_AGENT_STATUSES.INACTIVE) {
          await disableRuntimeAgent({ agentId: agent.id }).unwrap()
        } else if (nextStatus === RUNTIME_AGENT_STATUSES.DEPRECATED) {
          await deprecateRuntimeAgent({ agentId: agent.id }).unwrap()
        } else {
          await updateRuntimeAgent({ agentId: agent.id, status: nextStatus }).unwrap()
        }

        addToast({
          title:
            nextStatus === RUNTIME_AGENT_STATUSES.ACTIVE
              ? 'Agent activated'
              : nextStatus === RUNTIME_AGENT_STATUSES.DEPRECATED
                ? 'Agent deprecated'
              : 'Agent set inactive',
          description: `${agent.name} is now ${nextStatus.toLowerCase()}.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to update agent status',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [activateRuntimeAgent, addToast, deprecateRuntimeAgent, disableRuntimeAgent, updateRuntimeAgent],
  )

  const validateAgent = useCallback(
    async (agent) => {
      if (!agent?.id) return

      try {
        const result = await validateRuntimeAgent({ agentId: agent.id }).unwrap()
        const payload = result?.data && typeof result.data === 'object' ? result.data : {}
        const warnings = Array.isArray(payload?.warnings) ? payload.warnings : []

        addToast({
          title: 'Agent validated',
          description: warnings.length > 0 ? warnings.join(' ') : 'No issues were found.',
          variant: warnings.length > 0 ? 'warning' : 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        const details = appError.details && typeof appError.details === 'object' ? appError.details : null
        const detailMessage = details ? Object.values(details).filter(Boolean).join(' ') : ''

        addToast({
          title: 'Agent validation failed',
          description: detailMessage || appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, validateRuntimeAgent],
  )

  const handleTestSubmit = useCallback(
    async (event) => {
      event?.preventDefault?.()

      if (!testAgent?.id) return

      setTestErrors({})

      const input = parseJsonObject(testForm.inputJson)
      const context = parseJsonObject(testForm.contextJson)
      const nextErrors = {}

      if (input.error) nextErrors.inputJson = input.error
      if (context.error) nextErrors.contextJson = context.error

      if (Object.keys(nextErrors).length > 0) {
        setTestErrors(nextErrors)
        return
      }

      try {
        const payload = {
          ...(String(testForm.frameworkKey ?? '').trim()
            ? { frameworkKey: String(testForm.frameworkKey ?? '').trim() }
            : {}),
          input: input.value ?? {},
          context: context.value ?? {},
        }

        const result = await testRuntimeAgent({ agentId: testAgent.id, ...payload }).unwrap()
        const body = result?.data && typeof result.data === 'object' ? result.data : {}
        const warnings = Array.isArray(body?.warnings) ? body.warnings : []
        const promptHash = String(body?.promptHash ?? '').trim()
        const compiledPromptPreview = String(body?.compiledPromptPreview ?? '')

        setTestResult({
          promptHash,
          compiledPromptPreview,
          warnings,
        })

        addToast({
          title: 'Agent test completed',
          description: [
            ...(promptHash ? [`Prompt hash: ${promptHash}.`] : []),
            ...(warnings.length > 0 ? [warnings.join(' ')] : []),
          ].join(' ') || 'No issues were found.',
          variant: warnings.length > 0 ? 'warning' : 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        const details = appError.details && typeof appError.details === 'object' ? appError.details : null
        const detailMessage = details ? Object.values(details).filter(Boolean).join(' ') : ''

        addToast({
          title: 'Agent test failed',
          description: detailMessage || appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, testAgent, testForm.contextJson, testForm.frameworkKey, testForm.inputJson, testRuntimeAgent],
  )

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    frameworkFilter,
    setFrameworkFilter,
    page,
    setPage,
    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,
    frameworkOptions,
    activeFrameworkOptions,
    setAgentStatus,
    validateAgent,
    testOpen,
    testAgent,
    testForm,
    setTestForm,
    testErrors,
    setTestErrors,
    testResult,
    openTestDialog,
    closeTestDialog,
    handleTestSubmit,
  }
}
