import { useState } from 'react'
import { useListDeniedAccessLogsQuery } from '../../store/api/superAdminAuditApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  INITIAL_FILTERS,
  toStartOfDayIso,
  toEndOfDayIso,
} from './superAdminDeniedAccessLogs.constants.js'

export function useDeniedAccessLogManagement() {
  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [page, setPage] = useState(1)

  const {
    data: logsResponse,
    isLoading,
    isFetching,
    error,
  } = useListDeniedAccessLogsQuery({
    page,
    pageSize: 20,
    actorUserId: filters.actorUserId.trim(),
    startDate: toStartOfDayIso(filters.startDate),
    endDate: toEndOfDayIso(filters.endDate),
  })

  const rows = logsResponse?.data ?? []
  const pagination = logsResponse?.meta ?? {}
  const totalPages = Number(pagination.totalPages) || 1
  const currentPage = Number(pagination.page) || page
  const total = Number(pagination.total) || 0
  const appError = error ? normalizeError(error) : null

  const applyFilters = () => {
    setFilters(draftFilters)
    setPage(1)
  }

  const resetFilters = () => {
    setDraftFilters(INITIAL_FILTERS)
    setFilters(INITIAL_FILTERS)
    setPage(1)
  }

  return {
    draftFilters,
    setDraftFilters,
    setPage,

    rows,
    currentPage,
    totalPages,
    total,
    isLoading,
    isFetching,
    appError,

    applyFilters,
    resetFilters,
  }
}
