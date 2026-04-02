import { useState } from 'react'
import {
  useQueryAuditLogsQuery,
  useGetAuditStatsQuery,
  useLazyGetAuditLogsByRequestQuery,
  useLazyGetAuditLogsByResourceQuery,
  useVerifyAuditIntegrityMutation,
} from '../../store/api/auditLogApi.js'
import { useToaster } from '../../components/Toaster'
import { normalizeError } from '../../utils/errors.js'
import { parseIds } from './superAdminAuditLogs.constants.js'

export function useAuditLogManagement() {
  const { addToast } = useToaster()

  const [filters, setFilters] = useState({
    requestId: '',
    action: '',
    resourceType: '',
    actorUserId: '',
    resourceId: '',
    customerId: '',
    startDate: '',
    endDate: '',
  })
  const [page, setPage] = useState(1)

  const [requestLookupId, setRequestLookupId] = useState('')
  const [resourceLookup, setResourceLookup] = useState({
    resourceType: 'Customer',
    resourceId: '',
  })

  const [verifyForm, setVerifyForm] = useState({
    ids: '',
    customerId: '',
    startDate: '',
    endDate: '',
    limit: '1000',
  })
  const [verifyError, setVerifyError] = useState('')
  const [verifyResultData, setVerifyResultData] = useState(null)

  const {
    data: auditListResponse,
    isLoading: isAuditListLoading,
    isFetching: isAuditListFetching,
    error: auditListError,
  } = useQueryAuditLogsQuery({
    page,
    pageSize: 20,
    requestId: filters.requestId.trim(),
    action: filters.action,
    resourceType: filters.resourceType,
    actorUserId: filters.actorUserId.trim(),
    resourceId: filters.resourceId.trim(),
    customerId: filters.customerId.trim(),
    startDate: filters.startDate ? `${filters.startDate}T00:00:00.000Z` : '',
    endDate: filters.endDate ? `${filters.endDate}T23:59:59.999Z` : '',
  }, { refetchOnMountOrArgChange: true })

  const { data: statsResponse, isFetching: isStatsFetching } = useGetAuditStatsQuery({
    customerId: filters.customerId.trim(),
    startDate: filters.startDate ? `${filters.startDate}T00:00:00.000Z` : '',
    endDate: filters.endDate ? `${filters.endDate}T23:59:59.999Z` : '',
  }, { refetchOnMountOrArgChange: true })

  const [lookupByRequest, requestLookupResult] = useLazyGetAuditLogsByRequestQuery()
  const [lookupByResource, resourceLookupResult] = useLazyGetAuditLogsByResourceQuery()
  const [verifyIntegrity, verifyIntegrityResult] = useVerifyAuditIntegrityMutation()

  const rows = auditListResponse?.data ?? []
  const meta = auditListResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page

  const listAppError = auditListError ? normalizeError(auditListError) : null
  const requestRows = requestLookupResult.data?.data ?? []
  const resourceRows = resourceLookupResult.data?.data ?? []
  const stats = statsResponse?.data ?? {}

  const handleVerifyIntegrity = async () => {
    setVerifyError('')
    const ids = parseIds(verifyForm.ids)
    const payload = {
      ...(ids.length > 0 ? { ids } : {}),
      ...(verifyForm.customerId.trim() ? { customerId: verifyForm.customerId.trim() } : {}),
      ...(verifyForm.startDate ? { startDate: `${verifyForm.startDate}T00:00:00.000Z` } : {}),
      ...(verifyForm.endDate ? { endDate: `${verifyForm.endDate}T23:59:59.999Z` } : {}),
      limit: Number.parseInt(verifyForm.limit, 10) || 1000,
    }
    if (!payload.ids && !payload.customerId && !payload.startDate && !payload.endDate) {
      setVerifyError('Provide at least one filter before verification.')
      return
    }
    try {
      const response = await verifyIntegrity(payload).unwrap()
      setVerifyResultData(response?.data ?? response)
      addToast({
        title: 'Integrity verification complete',
        description: 'Audit log signatures have been verified.',
        variant: 'success',
      })
    } catch (err) {
      const appError = normalizeError(err)
      setVerifyError(appError.message)
    }
  }

  return {
    filters,
    setFilters,
    page,
    setPage,

    rows,
    currentPage,
    totalPages,
    isAuditListLoading,
    isAuditListFetching,
    listAppError,

    requestLookupId,
    setRequestLookupId,
    lookupByRequest,
    requestLookupResult,
    requestRows,

    resourceLookup,
    setResourceLookup,
    lookupByResource,
    resourceLookupResult,
    resourceRows,

    stats,
    isStatsFetching,

    verifyForm,
    setVerifyForm,
    verifyError,
    verifyResultData,
    verifyIntegrityResult,
    handleVerifyIntegrity,
  }
}
