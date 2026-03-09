import { useCallback, useState } from 'react'
import {
  useCreatePolicyMutation,
  useGetActivePolicyQuery,
  useGetPolicyHistoryQuery,
  useUpdatePolicyMetadataMutation,
} from '../../store/api/systemVersioningApi.js'
import { useToaster } from '../../components/Toaster'
import { normalizeError } from '../../utils/errors.js'
import { INITIAL_CREATE_FORM } from './superAdminSystemVersioning.constants.js'

export function useSystemVersioningManagement() {
  const { addToast } = useToaster()

  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM)
  const [createErrors, setCreateErrors] = useState({})
  const [createStepUpToken, setCreateStepUpToken] = useState('')

  const [historyPage, setHistoryPage] = useState(1)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState('')
  const [editStepUpToken, setEditStepUpToken] = useState('')

  const {
    data: activePolicyResponse,
    isLoading: isActivePolicyLoading,
    error: activePolicyError,
  } = useGetActivePolicyQuery()

  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    error: historyError,
  } = useGetPolicyHistoryQuery({ page: historyPage, pageSize: 20 })

  const [createPolicy, createPolicyResult] = useCreatePolicyMutation()
  const [updatePolicyMetadata, updatePolicyMetadataResult] =
    useUpdatePolicyMetadataMutation()

  const activePolicy = activePolicyResponse?.data ?? null
  const policyHistory = historyResponse?.data ?? []
  const historyMeta = historyResponse?.meta ?? {}
  const historyTotalPages = Number(historyMeta.totalPages) || 1
  const historyCurrentPage = Number(historyMeta.page) || historyPage
  const activePolicyAppError = activePolicyError
    ? normalizeError(activePolicyError)
    : null
  const noActivePolicy =
    activePolicyAppError?.code === 'NO_ACTIVE_POLICY' ||
    activePolicyAppError?.status === 404
  const historyAppError = historyError ? normalizeError(historyError) : null

  const validateCreateForm = useCallback(() => {
    const nextErrors = {}
    if (!createForm.name.trim()) {
      nextErrors.name = 'Name is required.'
    }
    if (!createForm.rules.trim()) {
      nextErrors.rules = 'Rules JSON is required.'
    }
    if (!createForm.reason.trim()) {
      nextErrors.reason = 'Reason is required.'
    }
    if (!createStepUpToken) {
      nextErrors.stepUp = 'Step-up verification is required before creating a policy.'
    }

    if (createForm.rules.trim()) {
      try {
        JSON.parse(createForm.rules)
      } catch {
        nextErrors.rules = 'Rules must be valid JSON.'
      }
    }

    return nextErrors
  }, [createForm, createStepUpToken])

  const handleCreatePolicy = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const validationErrors = validateCreateForm()
      if (Object.keys(validationErrors).length > 0) {
        setCreateErrors(validationErrors)
        return
      }

      const payload = {
        name: createForm.name.trim(),
        ...(createForm.description.trim()
          ? { description: createForm.description.trim() }
          : {}),
        rules: JSON.parse(createForm.rules),
        reason: createForm.reason.trim(),
      }

      try {
        await createPolicy({ body: payload, stepUpToken: createStepUpToken }).unwrap()
        setCreateForm(INITIAL_CREATE_FORM)
        setCreateStepUpToken('')
        addToast({
          title: 'Policy version created',
          description: 'A new active system versioning policy was created.',
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        setCreateStepUpToken('')
        addToast({
          title: 'Failed to create policy',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [createForm, createStepUpToken, validateCreateForm, createPolicy, addToast],
  )

  const openEditDialog = useCallback((policy) => {
    setSelectedPolicy(policy)
    setEditName(policy.name ?? '')
    setEditDescription(policy.description ?? '')
    setEditError('')
    setEditStepUpToken('')
    setEditDialogOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditDialogOpen(false)
    setSelectedPolicy(null)
    setEditName('')
    setEditDescription('')
    setEditError('')
    setEditStepUpToken('')
  }, [])

  const handleUpdatePolicy = useCallback(async () => {
    if (!selectedPolicy) return

    if (!editName.trim()) {
      setEditError('Policy name is required.')
      return
    }

    if (!editStepUpToken) {
      setEditError('Step-up verification is required before updating.')
      return
    }

    setEditError('')

    try {
      await updatePolicyMetadata({
        policyId: selectedPolicy.id ?? selectedPolicy._id,
        stepUpToken: editStepUpToken,
        body: {
          name: editName.trim(),
          description: editDescription.trim(),
        },
      }).unwrap()

      addToast({
        title: 'Policy updated',
        description: 'Policy metadata updated successfully.',
        variant: 'success',
      })
      closeEditDialog()
    } catch (err) {
      const appError = normalizeError(err)
      setEditStepUpToken('')
      setEditError(appError.message)
      addToast({
        title: 'Failed to update policy',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    selectedPolicy,
    editName,
    editDescription,
    editStepUpToken,
    updatePolicyMetadata,
    addToast,
    closeEditDialog,
  ])

  return {
    createForm,
    setCreateForm,
    createErrors,
    setCreateErrors,
    createStepUpToken,
    setCreateStepUpToken,
    handleCreatePolicy,
    createPolicyResult,

    activePolicy,
    isActivePolicyLoading,
    activePolicyAppError,
    noActivePolicy,

    historyPage,
    setHistoryPage,
    policyHistory,
    historyCurrentPage,
    historyTotalPages,
    isHistoryLoading,
    isHistoryFetching,
    historyAppError,

    editDialogOpen,
    openEditDialog,
    closeEditDialog,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editError,
    setEditError,
    editStepUpToken,
    setEditStepUpToken,
    handleUpdatePolicy,
    updatePolicyMetadataResult,
  }
}
