import { useCallback, useMemo, useState } from 'react'
import { useListFrameworkRegistriesQuery, useListValidationRegistryQuery } from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { VALIDATION_REGISTRY_PAGE_SIZE } from './superAdminValidationRegistry.constants.js'

export function useValidationRegistryManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: frameworkResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
    status: 'ACTIVE',
    type: '',
    structureType: '',
  })

  const frameworkRows = Array.isArray(frameworkResponse?.data?.data)
    ? frameworkResponse.data.data
    : Array.isArray(frameworkResponse?.data)
      ? frameworkResponse.data
      : []

  const frameworkOptions = useMemo(() => {
    const keys = frameworkRows
      .map((row) => String(row?.frameworkKey ?? row?.key ?? '').trim().toUpperCase())
      .filter(Boolean)
    const unique = [...new Set(keys)].sort()
    return [{ value: '', label: 'All' }, ...unique.map((value) => ({ value, label: value }))]
  }, [frameworkRows])

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListValidationRegistryQuery({
    page,
    pageSize: VALIDATION_REGISTRY_PAGE_SIZE,
    q: search,
    status: statusFilter,
    frameworkKey: frameworkFilter,
    category: categoryFilter,
    severity: severityFilter,
  })

  const rows = Array.isArray(listResponse?.data?.data)
    ? listResponse.data.data
    : Array.isArray(listResponse?.data)
      ? listResponse.data
      : []

  const meta = listResponse?.data?.meta && typeof listResponse.data.meta === 'object'
    ? listResponse.data.meta
    : {}

  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null

  const setSearchValue = useCallback((value) => setSearch(String(value ?? '')), [])

  return {
    search,
    setSearch: setSearchValue,
    statusFilter,
    setStatusFilter,
    frameworkFilter,
    setFrameworkFilter,
    categoryFilter,
    setCategoryFilter,
    severityFilter,
    setSeverityFilter,
    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,
    setPage,
    frameworkOptions,
  }
}

