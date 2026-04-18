import { useState } from 'react'
import { useListSkillRolesQuery } from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { SKILL_ROLE_REGISTRY_PAGE_SIZE } from './superAdminSkillRoleRegistry.constants.js'

export function useSkillRoleRegistryManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListSkillRolesQuery({
    page,
    pageSize: SKILL_ROLE_REGISTRY_PAGE_SIZE,
    q: search.trim(),
    status: statusFilter || undefined,
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
    setPage,
    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,
  }
}

