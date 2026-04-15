import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToaster } from '../../components/Toaster'
import {
  useCreateWorkflowPolicyMutation,
  useListFrameworkRegistriesQuery,
  useListWorkflowPoliciesQuery,
  useUpdateWorkflowPolicyMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  buildFrameworkRegistryAllowedKeys,
  buildFrameworkRegistryOptions,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  INITIAL_WORKFLOW_POLICY_FORM,
  mapWorkflowPolicyToForm,
  validateWorkflowPolicyForm,
  WORKFLOW_POLICY_PAGE_SIZE,
  WORKFLOW_POLICY_STATUSES,
} from './superAdminWorkflowPolicies.constants.js'

const buildDefaultWorkflowPolicyForm = (registryRows) => ({
  ...INITIAL_WORKFLOW_POLICY_FORM,
  frameworkKeys: registryRows[0]?.frameworkKey
    ? String(registryRows[0].frameworkKey).trim()
    : '',
})

export function useWorkflowPolicyManagement() {
  const { addToast } = useToaster()
  const [searchParams] = useSearchParams()

  const initialSearch = String(searchParams.get('q') ?? '')
  const initialStatus = String(searchParams.get('status') ?? '')
  // List filtering uses a single `frameworkKey` value; the policy form uses a newline-separated `frameworkKeys` string.
  const initialFramework = String(searchParams.get('frameworkKey') ?? '').trim()

  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [frameworkFilter, setFrameworkFilter] = useState(initialFramework)
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(buildDefaultWorkflowPolicyForm([]))
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

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const [createWorkflowPolicy] = useCreateWorkflowPolicyMutation()
  const [updateWorkflowPolicy] = useUpdateWorkflowPolicyMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null
  const registryRows = registryResponse?.data ?? []
  const frameworkOptions = buildFrameworkRegistryOptions(registryRows)
  const allowedFrameworkKeys = buildFrameworkRegistryAllowedKeys(registryRows)

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateForm(buildDefaultWorkflowPolicyForm(registryRows))
    setCreateOpen(true)
  }, [registryRows])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm(buildDefaultWorkflowPolicyForm(registryRows))
    setCreateErrors({})
  }, [registryRows])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateWorkflowPolicyForm(createForm, rows, '', allowedFrameworkKeys)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      try {
        await createWorkflowPolicy(payload).unwrap()
        closeCreateDialog()
        setPage(1)
        addToast({
          title: 'Workflow policy created',
          description: `${payload.name} is now available in the Runtime Control catalogue.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = getRuntimeControlFieldErrorMap(appError, [
          'key',
          'name',
          'description',
          'frameworkKeys',
          'status',
          'steps',
        ])

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
    [addToast, closeCreateDialog, createForm, createWorkflowPolicy, rows, allowedFrameworkKeys],
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
      const { errors, payload } = validateWorkflowPolicyForm(
        editForm,
        rows,
        editPolicyId,
        allowedFrameworkKeys,
      )
      if (Object.keys(errors).length > 0) {
        setEditErrors(errors)
        return
      }

      try {
        await updateWorkflowPolicy({
          policyId: editPolicyId,
          ...payload,
        }).unwrap()

        addToast({
          title: 'Workflow policy updated',
          description: 'Changes were saved successfully.',
          variant: 'success',
        })
        closeEditDialog()
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = getRuntimeControlFieldErrorMap(appError, [
          'key',
          'name',
          'description',
          'frameworkKeys',
          'status',
          'steps',
        ])

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
    [addToast, closeEditDialog, editForm, editPolicyId, rows, allowedFrameworkKeys, updateWorkflowPolicy],
  )

  const setWorkflowPolicyStatus = useCallback(
    async (policy, nextStatus) => {
      if (!policy?.id || policy.status === nextStatus) {
        return
      }

      try {
        await updateWorkflowPolicy({
          policyId: policy.id,
          status: nextStatus,
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
    [addToast, updateWorkflowPolicy],
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
