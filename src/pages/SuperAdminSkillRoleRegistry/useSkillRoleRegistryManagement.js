import { useState } from 'react'
import { useListSkillRolesQuery } from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  SKILL_ROLE_REGISTRY_PAGE_SIZE,
  SKILL_ROLE_REGISTRY_SORT_OPTIONS,
} from './superAdminSkillRoleRegistry.constants.js'

const DEFAULT_SORT_VALUE = SKILL_ROLE_REGISTRY_SORT_OPTIONS[0]?.value ?? 'updatedAt:desc'

const parseSortValue = (value) => {
  const [sortBy = 'updatedAt', sortOrder = 'desc'] = String(value ?? '').split(':')
  return {
    sortBy: sortBy || 'updatedAt',
    sortOrder: sortOrder || 'desc',
  }
}

export function useSkillRoleRegistryManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortValue, setSortValue] = useState(DEFAULT_SORT_VALUE)
  const { sortBy, sortOrder } = parseSortValue(sortValue)

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
    sortBy,
    sortOrder,
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
    sortValue,
    setSortValue,
    setPage,
    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,
  }
}
