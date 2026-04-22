import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToaster } from '../../components/Toaster'
import {
  useListFrameworkRegistriesQuery,
  useListWorkflowPoliciesQuery,
  useUpdateWorkflowPolicyMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  buildFrameworkRegistryOptions,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  WORKFLOW_POLICY_PAGE_SIZE,
  WORKFLOW_POLICY_STATUSES,
} from './superAdminWorkflowPolicies.constants.js'

export function useWorkflowPolicyManagement() {
  const { addToast } = useToaster()
  const [searchParams] = useSearchParams()

  const initialSearch = String(searchParams.get('q') ?? '')
  const initialStatus = String(searchParams.get('status') ?? '')
  const initialFramework = String(searchParams.get('frameworkKey') ?? '').trim()
  const initialType = String(searchParams.get('type') ?? '').trim().toUpperCase()

  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [frameworkFilter, setFrameworkFilter] = useState(initialFramework)
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [page, setPage] = useState(1)

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
    type: typeFilter || undefined,
  })

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const [updateWorkflowPolicy] = useUpdateWorkflowPolicyMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null
  const registryRows = registryResponse?.data ?? []
  const frameworkOptions = buildFrameworkRegistryOptions(registryRows)

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
              : 'Workflow policy updated',
          description: `${policy.name} is now ${String(nextStatus).toLowerCase()}.`,
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
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,
    frameworkOptions,
    setWorkflowPolicyStatus,
  }
}
