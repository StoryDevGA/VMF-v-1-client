import { useCallback, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useCreateWorkflowPolicyMutation,
  useListWorkflowPoliciesQuery,
  useUpdateWorkflowPolicyMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  INITIAL_WORKFLOW_POLICY_FORM,
  mapWorkflowPolicyToForm,
  validateWorkflowPolicyForm,
  WORKFLOW_POLICY_PAGE_SIZE,
  WORKFLOW_POLICY_STATUSES,
} from './superAdminWorkflowPolicies.constants.js'

const getFieldErrorMap = (appError) => {
  const field = String(appError?.details?.field ?? '').trim()
  return field ? { [field]: appError.message } : {}
}

export function useWorkflowPolicyManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [page, setPage] = useState(1)
  const [stepUpToken, setStepUpToken] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    ...INITIAL_WORKFLOW_POLICY_FORM,
  })
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [editPolicyId, setEditPolicyId] = useState('')
  const [editForm, setEditForm] = useState({
    ...INITIAL_WORKFLOW_POLICY_FORM,
  })
  const [editErrors, setEditErrors] = useState({})

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListWorkflowPoliciesQuery({
    page,
    pageSize: WORKFLOW_POLICY_PAGE_SIZE,
    q: search.trim(),
    status: statusFilter || undefined,
    frameworkKey: frameworkFilter || undefined,
  })

  const [createWorkflowPolicy] = useCreateWorkflowPolicyMutation()
  const [updateWorkflowPolicy] = useUpdateWorkflowPolicyMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateForm({
      ...INITIAL_WORKFLOW_POLICY_FORM,
    })
    setCreateOpen(true)
  }, [])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm({
      ...INITIAL_WORKFLOW_POLICY_FORM,
    })
    setCreateErrors({})
  }, [])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateWorkflowPolicyForm(createForm)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      if (!stepUpToken) {
        addToast({
          title: 'Step-up verification required',
          description: 'Verify identity before creating a workflow policy.',
          variant: 'warning',
        })
        return
      }

      try {
        await createWorkflowPolicy({ ...payload, stepUpToken }).unwrap()
        closeCreateDialog()
        setPage(1)
        addToast({
          title: 'Workflow policy created',
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
          title: 'Failed to create workflow policy',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, closeCreateDialog, createForm, createWorkflowPolicy, stepUpToken],
  )

  const openEditDialog = useCallback((policy) => {
    setEditPolicyId(policy.id)
    setEditErrors({})
    setEditForm(mapWorkflowPolicyToForm(policy))
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setEditPolicyId('')
    setEditForm({
      ...INITIAL_WORKFLOW_POLICY_FORM,
    })
    setEditErrors({})
  }, [])

  const handleEditSubmit = useCallback(
    async () => {
      if (!editPolicyId) return

      setEditErrors({})
      const { errors, payload } = validateWorkflowPolicyForm(editForm)
      if (Object.keys(errors).length > 0) {
        setEditErrors(errors)
        return
      }

      if (!stepUpToken) {
        addToast({
          title: 'Step-up verification required',
          description: 'Verify identity before updating a workflow policy.',
          variant: 'warning',
        })
        return
      }

      try {
        await updateWorkflowPolicy({
          policyId: editPolicyId,
          ...payload,
          stepUpToken,
        }).unwrap()

        addToast({
          title: 'Workflow policy updated',
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
          title: 'Failed to update workflow policy',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, closeEditDialog, editForm, editPolicyId, stepUpToken, updateWorkflowPolicy],
  )

  const setWorkflowPolicyStatus = useCallback(
    async (policy, nextStatus) => {
      if (!policy?.id || policy.status === nextStatus) {
        return
      }

      if (!stepUpToken) {
        addToast({
          title: 'Step-up verification required',
          description: 'Verify identity before changing workflow policy status.',
          variant: 'warning',
        })
        return
      }

      try {
        await updateWorkflowPolicy({
          policyId: policy.id,
          status: nextStatus,
          stepUpToken,
        }).unwrap()

        addToast({
          title:
            nextStatus === WORKFLOW_POLICY_STATUSES.ACTIVE
              ? 'Workflow policy activated'
              : 'Workflow policy set inactive',
          description: `${policy.name} is now ${nextStatus.toLowerCase()}.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to update workflow policy status',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, stepUpToken, updateWorkflowPolicy],
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
    stepUpToken,
    setStepUpToken,
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
    setWorkflowPolicyStatus,
  }
}
