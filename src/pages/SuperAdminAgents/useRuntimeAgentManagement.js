import { useCallback, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useCreateRuntimeAgentMutation,
  useListRuntimeAgentsQuery,
  useUpdateRuntimeAgentMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  INITIAL_RUNTIME_AGENT_FORM,
  mapRuntimeAgentToForm,
  RUNTIME_AGENT_PAGE_SIZE,
  RUNTIME_AGENT_STATUSES,
  validateRuntimeAgentForm,
} from './superAdminAgents.constants.js'

const getFieldErrorMap = (appError) => {
  const field = String(appError?.details?.field ?? '').trim()
  return field ? { [field]: appError.message } : {}
}

export function useRuntimeAgentManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    ...INITIAL_RUNTIME_AGENT_FORM,
  })
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [editAgentId, setEditAgentId] = useState('')
  const [editForm, setEditForm] = useState({
    ...INITIAL_RUNTIME_AGENT_FORM,
  })
  const [editErrors, setEditErrors] = useState({})

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

  const [createRuntimeAgent] = useCreateRuntimeAgentMutation()
  const [updateRuntimeAgent] = useUpdateRuntimeAgentMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateForm({
      ...INITIAL_RUNTIME_AGENT_FORM,
    })
    setCreateOpen(true)
  }, [])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm({
      ...INITIAL_RUNTIME_AGENT_FORM,
    })
    setCreateErrors({})
  }, [])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateRuntimeAgentForm(createForm)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      try {
        await createRuntimeAgent(payload).unwrap()
        closeCreateDialog()
        setPage(1)
        addToast({
          title: 'Agent created',
          description: `${payload.name} is now available in the Runtime Control catalogue.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = getFieldErrorMap(appError)

        if (Object.keys(fieldErrors).length > 0) {
          setCreateErrors(fieldErrors)
          return
        }

        addToast({
          title: 'Failed to create agent',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, closeCreateDialog, createForm, createRuntimeAgent],
  )

  const openEditDialog = useCallback((agent) => {
    setEditAgentId(agent.id)
    setEditErrors({})
    setEditForm(mapRuntimeAgentToForm(agent))
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setEditAgentId('')
    setEditForm({
      ...INITIAL_RUNTIME_AGENT_FORM,
    })
    setEditErrors({})
  }, [])

  const handleEditSubmit = useCallback(
    async () => {
      if (!editAgentId) return

      setEditErrors({})
      const { errors, payload } = validateRuntimeAgentForm(editForm)
      if (Object.keys(errors).length > 0) {
        setEditErrors(errors)
        return
      }

      try {
        await updateRuntimeAgent({
          agentId: editAgentId,
          ...payload,
        }).unwrap()

        addToast({
          title: 'Agent updated',
          description: 'Changes were saved successfully.',
          variant: 'success',
        })
        closeEditDialog()
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = getFieldErrorMap(appError)

        if (Object.keys(fieldErrors).length > 0) {
          setEditErrors(fieldErrors)
          return
        }

        addToast({
          title: 'Failed to update agent',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, closeEditDialog, editAgentId, editForm, updateRuntimeAgent],
  )

  const setAgentStatus = useCallback(
    async (agent, nextStatus) => {
      if (!agent?.id || agent.status === nextStatus) {
        return
      }

      try {
        await updateRuntimeAgent({
          agentId: agent.id,
          status: nextStatus,
        }).unwrap()

        addToast({
          title:
            nextStatus === RUNTIME_AGENT_STATUSES.ACTIVE
              ? 'Agent activated'
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
    [addToast, updateRuntimeAgent],
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
    createOpen,
    createForm,
    setCreateForm,
    createErrors,
    setCreateErrors,
    openCreateDialog,
    closeCreateDialog,
    handleCreateSubmit,
    editOpen,
    editForm,
    setEditForm,
    editErrors,
    openEditDialog,
    closeEditDialog,
    handleEditSubmit,
    setAgentStatus,
  }
}
