import { useState } from 'react'
import { useListRuntimePathsQuery } from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { RUNTIME_PATH_REGISTRY_PAGE_SIZE } from './superAdminRuntimePathRegistry.constants.js'

export function useRuntimePathRegistryManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [operationFilter, setOperationFilter] = useState('')
  const [protectedFilter, setProtectedFilter] = useState('')
  const [page, setPage] = useState(1)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListRuntimePathsQuery({
    page,
    pageSize: RUNTIME_PATH_REGISTRY_PAGE_SIZE,
    q: search.trim(),
    status: statusFilter || undefined,
    operation: operationFilter || undefined,
    isProtected: protectedFilter || undefined,
  })

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    operationFilter,
    setOperationFilter,
    protectedFilter,
    setProtectedFilter,
    setPage,
    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,
  }
}
